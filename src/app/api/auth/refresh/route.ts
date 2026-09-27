import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { apiError, assertSameOrigin, handleApiError } from "@/lib/api";
import { transaction } from "@/lib/db";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { REFRESH_COOKIE, clearRefreshCookie, hashToken, setRefreshCookie } from "@/lib/auth/session";
type RefreshRecord={id:string;user_id:string;family_id:string;revoked_at:Date|null;expires_at:Date};type SessionUser={id:string;username:string;nickname?:string|null;avatarObjectId?:string|null};
export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return apiError("请求来源无效", 403, "ORIGIN_REJECTED");
  try {
    const token = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (!token) return apiError("登录已过期", 401, "SESSION_EXPIRED");
    const claims = await verifyRefreshToken(token);
    const result = await transaction(async (client) => {
      const record = await client.query<RefreshRecord>(`SELECT id,user_id,family_id,revoked_at,expires_at FROM refresh_tokens WHERE jti=$1 AND token_hash=$2 FOR UPDATE`, [claims.jti, hashToken(token)]);
      const current = record.rows[0];
      if (!current || current.revoked_at || new Date(current.expires_at) <= new Date()) {
        await client.query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE family_id=$1", [claims.familyId]);
        throw new Error("REFRESH_REUSED");
      }
      const users = await client.query<SessionUser>(`SELECT id,username,nickname,avatar_object_id AS "avatarObjectId" FROM users WHERE id=$1 AND status='active'`, [claims.sub]);
      if (!users.rows[0]) throw new Error("USER_INACTIVE");
      const jti = randomUUID();
      const next = await signRefreshToken(claims.sub!, jti, claims.familyId);
      await client.query("UPDATE refresh_tokens SET revoked_at=NOW(),replaced_by_jti=$1 WHERE id=$2", [jti, current.id]);
      await client.query(`INSERT INTO refresh_tokens(user_id,jti,family_id,token_hash,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '7 days')`, [claims.sub, jti, claims.familyId, hashToken(next)]);
      return { user: users.rows[0], refreshToken: next, accessToken: await signAccessToken(users.rows[0]) };
    });
    await setRefreshCookie(result.refreshToken);
    return NextResponse.json({ user: result.user, accessToken: result.accessToken });
  } catch (error) {
    await clearRefreshCookie();
    if (error instanceof Error && ["REFRESH_REUSED","USER_INACTIVE","INVALID_REFRESH_TOKEN"].includes(error.message)) return apiError("登录已过期，请重新登录", 401, "SESSION_EXPIRED");
    return handleApiError(error);
  }
}
