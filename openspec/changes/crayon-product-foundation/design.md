## Context

当前 Crayon 是纯前端 Next.js App Router 项目，仅实现单页首页和展示性创作预览，没有服务端业务接口、数据库模型、登录态或对象存储。用户已有 PostgreSQL，并希望使用 RustFS 保存头像、原图和转换结果。参考项目 `bytedance-train` 已验证了一种双 Token 模式：短期 Access Token 存内存，Refresh Token 放 HttpOnly Cookie，服务端保存哈希与 `jti`，刷新时事务轮换，客户端合并并发刷新并在 401 后重试一次。本设计吸收该机制，但账户标识改为唯一用户名，并让头像走对象存储而非 Base64 请求体。详见 `proposal.md` 与六个 capability specs。

## Goals / Non-Goals

**Goals:**
- 在现有 Next.js 应用中建立可独立验证的账户、会话、画册和图片持久化基础。
- 保证前端脚本不能读取 Refresh Token，数据库泄露时不直接暴露有效 Refresh Token，旧 Token 不能重复刷新。
- 让大图片绕过 Next.js 进程直传 RustFS，并通过缩略图和分页降低画册加载成本。
- 保持首页艺术构图，同时建立清晰的站内功能层级和博客/用户入口区分。

**Non-Goals:**
- 本阶段不接入短信、邮箱验证码、第三方 OAuth、密码找回或管理员人工重置后台。
- 不在本 change 内定义具体的 AI 图片转换模型、任务队列实现或教程生成算法。
- 不把 RustFS 单节点单盘部署视为生产级数据冗余方案。
- 不开放公共 bucket，也不让浏览器持有 RustFS Access Key/Secret Key。

## Decisions

### 1. 使用 Next.js Route Handlers 承载首版后端接口

账户、会话、上传签名和画册 API 与前端放在同一 Next.js 应用，通过 Node.js runtime 的 Route Handlers 访问 PostgreSQL 和 RustFS。首版无需额外维护 Express 服务，Cookie 同源策略也更简单。数据库访问使用 `pg` 连接池和显式 SQL migration，保留事务与 `SELECT ... FOR UPDATE` 的控制能力。

备选方案是拆分独立 Express 服务，适合后续转换任务规模扩大后再演进；当前会增加部署、跨域 Cookie 和共享类型成本。

### 2. 用户名是唯一登录标识，昵称只负责展示

`users` 表至少包含：`id`、`username`、`username_normalized`、`nickname`、`password_hash`、`avatar_object_id`、`status`、`created_at`、`updated_at`。注册时对用户名去除首尾空白并生成规范化值，使用数据库唯一索引解决并发重复。用户名创建后首版不允许修改；昵称允许修改并可重复，避免昵称承担登录标识语义。

密码使用服务端带独立随机盐的内存困难哈希。首版优先使用 Node `crypto.scrypt` 并将算法版本及参数编码进存储值，比较时使用恒定时间比较；不照搬参考项目的 6 位最低要求，规格实施时采用更合理的最小长度并允许密码管理器生成的长密码。

### 3. 双 JWT 使用内存 Access Token 与 HttpOnly Refresh Cookie

Access Token 默认约 15 分钟有效，只存客户端内存并通过 `Authorization: Bearer` 发送。Refresh Token 默认约 7 天有效，使用独立密钥签名，写入 `HttpOnly; SameSite=Lax; Secure(生产); Path=/api/auth` Cookie。页面重新加载后通过刷新接口恢复会话，不把 Access Token 写入 localStorage。

`refresh_tokens` 表包含：`id`、`user_id`、`jti`、`family_id`、`token_hash`、`expires_at`、`revoked_at`、`replaced_by_jti`、`created_at`。数据库只保存 SHA-256 哈希，不保存 Refresh Token 明文。Access 与 Refresh 使用不同密钥，并校验 `type`、签发者、受众和过期时间。

登录/注册流程：

```text
浏览器                       Next.js                         PostgreSQL
  | POST 用户名+密码            |                                |
  |--------------------------->| 校验密码/创建用户                |
  |                            | 创建 refresh 记录 ------------>|
  |<-- access token + user ----|                                |
  |<-- HttpOnly refresh cookie-|                                |
```

刷新流程在一个数据库事务中执行：验证签名和类型，根据 `jti + hash` 锁定有效记录，撤销旧记录，写入同一 `family_id` 的新记录，然后设置新 Cookie。发现已撤销 Token 被重用时撤销整个会话族并要求重新登录。

### 4. 客户端请求层负责单飞刷新和有限重试

建立统一 API 请求封装：读取内存 Access Token，收到 401 或发现 Token 距过期不足约 30 秒时调用刷新。模块级 `refreshPromise` 让同一页面中的并发请求共享一次刷新；原请求只重试一次。`authGeneration` 或等价版本号确保退出前发起的刷新响应不能恢复已退出状态。

多标签页可用 `BroadcastChannel` 同步登录、刷新和退出结果；不支持时每个标签页仍遵守单次刷新和失败退出。刷新、退出接口还要校验同源 `Origin`，与 SameSite Cookie 一起降低 CSRF 风险。

### 5. 修改密码后撤销全部会话

修改密码必须提交当前密码。更新密码哈希与撤销该用户全部 Refresh Token 在同一事务中完成，随后清除当前 Cookie 和内存状态，要求用新密码登录。这样无需维护“旧 Token 在其他设备继续有效”的复杂例外。

### 6. PostgreSQL 管业务关系，RustFS 管图片字节

使用 S3 兼容 SDK连接 RustFS，并显式配置 endpoint、region、凭据和 path-style 选项。bucket 默认私有。`media_objects` 表保存 `id`、`owner_id`、`purpose`、`bucket`、`object_key`、`mime_type`、`byte_size`、`width`、`height`、`checksum`、`status`、时间戳；`artworks` 表引用原图、转换图和缩略图对象。

对象 key 使用不可猜测 ID，例如：

```text
users/{userId}/avatars/{objectId}/avatar.webp
users/{userId}/artworks/{artworkId}/source/{objectId}.jpg
users/{userId}/artworks/{artworkId}/result/{objectId}.webp
users/{userId}/artworks/{artworkId}/thumb/{objectId}.webp
```

上传分两步：服务端创建 `pending` 媒体记录并签发短期预签名 PUT URL；浏览器直传后调用完成接口，服务端通过 HEAD 校验 key、大小、类型与校验信息，再将记录改为 `ready`。头像上传成功且派生图生成后才替换用户头像引用。RustFS 暂时不可用时保留原头像和明确失败状态。

### 7. 画册只加载缩略图并采用游标分页

转换完成时生成 WebP/AVIF 缩略图。画册查询只返回作品元数据与短期缩略图读取地址，使用基于 `created_at + id` 的游标分页，避免 offset 在数据增长后产生不稳定翻页。原图与高清转换图只在详情页按需签发读取地址。

删除作品先在事务中标记删除并使其不再可见，再写入对象清理任务；实际 RustFS 删除可重试。这样对象存储故障不会让已删除作品重新出现。定时任务清理长期未确认的 `pending` 对象和失败任务遗留对象。

### 8. 首页桌面双栏、移动端单列

桌面中心使用约 55:45 的双栏：左侧保留四角贴纸画作与题签；右侧依次放 eyebrow、标题、说明、主按钮“开始创作”、次按钮“我的画册”和较轻的“关于 Crayon”。“开始创作”左侧使用蜡笔图标，“我的画册”使用画册图标，“关于”使用翻书或信息图标。

移动端回到单列：标题说明、画作、三个入口。页眉保留 GitHub、博客、用户与主题控制。博客按钮改用地球、指南针或外链语义图标；用户按钮未登录时显示通用人物图标，登录后显示用户头像。三个站内入口记录 `returnTo`，登录成功后恢复用户原先选择。

## Risks / Trade-offs

- [双 Token 轮换在多标签页并发时可能把合法请求识别为重放] → 使用页面内单飞刷新并通过 `BroadcastChannel` 同步；对刷新失败使用明确重新登录路径，并为并发情形编写测试。
- [用户名密码注册没有验证码，容易遭遇批量注册和撞库] → 增加 IP/用户名维度速率限制、通用错误、密码哈希成本和安全日志；验证码可作为未来独立能力加入。
- [没有邮箱或手机号时无法自助找回密码] → 登录和账户页明确说明该边界，首版不展示虚假的找回入口。
- [预签名上传可能产生孤儿对象] → 使用 pending 记录、完成确认和定时清理，短期 URL限制 key 与有效期。
- [RustFS 与数据库无法组成同一事务] → 使用状态机和补偿清理，不假设跨系统强一致。
- [私有图片的短期 URL 会过期] → 列表接口按需签发，客户端在过期或 403 时重新获取元数据；缩略图设置合理缓存策略。
- [单节点 RustFS 故障会丢失图片] → 生产部署使用多盘/多节点或独立备份，并定期做元数据与对象联合恢复演练。

## Migration Plan

1. 先增加环境变量校验、PostgreSQL migration 和 RustFS 私有 bucket，不改变现有首页行为。
2. 部署用户、Refresh Token、媒体对象和作品表，并验证回滚 migration。
3. 上线注册登录、双 Token 会话和账户页；在日志中观察刷新失败率和重复 Token 使用。
4. 上线头像直传与 RustFS 完成确认，再上线作品上传、缩略图和画册读取。
5. 最后切换首页双栏和新入口；保留现有“开始创作”预览作为功能未完成时的降级。
6. 回滚时先隐藏新入口并停止签发上传 URL，再回滚应用；保留数据库表和对象，避免破坏用户数据，待确认后单独清理。


### 9. 画册使用从左上进入中央的双页书本交互

“我的画册”使用覆盖桌面的双页组件：闭合状态从左上区域移动至中央并展开，背景同步降低视觉权重。每个物理页采用两列三行槽位，最多六幅；跨页最多十二幅。图片在相框内使用完整比例展示。左右按钮和键盘方向键切换跨页，首尾边界禁用对应方向；`prefers-reduced-motion` 下取消移动、展开与翻页长动画。关于页的创建缘起先保留明确占位，待创作者提供正式文案后替换。
