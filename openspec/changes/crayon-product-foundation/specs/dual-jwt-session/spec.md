## Purpose

定义 Crayon 的短期访问凭证与长期刷新凭证如何协同工作，使正常用户在会话有效期内无感续期，同时限制令牌泄露、重放和并发刷新带来的风险。

## ADDED Requirements

### Requirement: 分离 Access Token 与 Refresh Token
系统 SHALL 签发短期 Access Token 和长期 Refresh Token。Access Token SHALL 通过 Authorization Bearer 访问受保护接口；Refresh Token SHALL 仅通过限定路径的 HttpOnly Cookie 传输，不得暴露给客户端脚本。生产环境 Cookie SHALL 使用 Secure 和合适的 SameSite 属性。

#### Scenario: 登录后获得会话
- **WHEN** 用户成功登录或注册
- **THEN** 系统返回短期 Access Token，并通过 HttpOnly Cookie 设置长期 Refresh Token

#### Scenario: 客户端脚本读取凭证
- **WHEN** 页面脚本检查登录状态
- **THEN** 页面只能访问内存中的 Access Token，不能读取 Refresh Token

### Requirement: 服务端只保存 Refresh Token 的不可逆标识
系统 SHALL 为每个 Refresh Token 分配唯一 `jti`，并只在 PostgreSQL 中保存令牌哈希、用户、会话族、签发与过期状态，不得保存 Refresh Token 明文。

#### Scenario: 检查会话记录
- **WHEN** 服务端验证刷新请求
- **THEN** 系统使用 `jti` 与令牌哈希定位有效记录，而不依赖数据库中的明文令牌

### Requirement: Refresh Token 单次使用并轮换
每个有效 Refresh Token SHALL 只允许成功使用一次。刷新成功时系统 SHALL 在同一事务中撤销旧记录、签发新的 Access Token 和 Refresh Token，并保存新的哈希记录。

#### Scenario: 正常刷新
- **WHEN** 有效且未使用的 Refresh Token 请求刷新
- **THEN** 系统原子地撤销旧 Token、签发一对新 Token 并更新 Cookie

#### Scenario: 重复使用旧 Refresh Token
- **WHEN** 已轮换或已撤销的 Refresh Token 再次请求刷新
- **THEN** 系统拒绝请求、清除无效 Cookie，并使对应会话族失效

### Requirement: 前端无感刷新与单次重试
客户端 SHALL 在 Access Token 临近过期或受保护请求返回 401 时尝试刷新。刷新成功后 SHALL 使用新 Access Token 将原请求重试最多一次；刷新失败 SHALL 清除登录状态并进入重新登录流程，避免无限重试。

#### Scenario: Access Token 过期后继续操作
- **WHEN** 用户会话仍可刷新且受保护请求因 Access Token 过期返回 401
- **THEN** 客户端完成刷新并自动重试原请求，用户无需重新输入密码

#### Scenario: Refresh Token 已失效
- **WHEN** 自动刷新返回未授权或无法完成
- **THEN** 客户端停止重试、清除本地用户状态并提示重新登录

### Requirement: 合并并发刷新请求
同一浏览器上下文中同时出现多个刷新需求时，客户端 SHALL 复用同一个进行中的刷新结果，不得并发使用同一 Refresh Token 发起多次轮换。

#### Scenario: 多个请求同时收到 401
- **WHEN** 多个受保护请求在同一时间发现 Access Token 失效
- **THEN** 客户端只发送一次刷新请求，并让等待中的请求共享结果后分别重试一次

### Requirement: 退出与迟到刷新结果隔离
用户退出时系统 SHALL 撤销当前 Refresh Token 并清除 Cookie；客户端 SHALL 使退出前发起但退出后才完成的刷新结果失效，不得用迟到响应恢复已退出会话。

#### Scenario: 刷新过程中退出
- **WHEN** 用户在刷新请求完成前主动退出
- **THEN** 客户端忽略随后返回的新 Token，界面保持未登录状态

### Requirement: 会话过期与停用用户处理
系统 SHALL 拒绝过期、签名错误、类型错误、已撤销令牌以及不存在或不可用用户的刷新请求，并清除对应刷新 Cookie。

#### Scenario: 停用账户尝试刷新
- **WHEN** 已停用用户携带原 Refresh Token 请求刷新
- **THEN** 系统拒绝刷新并结束客户端登录状态
