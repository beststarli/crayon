import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { cookies } from "next/headers";
import { signAccessToken, signRefreshToken, verifyAccessToken } from "./jwt";

export const REFRESH_COOKIE = "crayon_refresh";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueSession(client: PoolClient, user: { id: string; username: string }, familyId = randomUUID()) {
  const jti = randomUUID();
  const refreshToken = await signRefreshToken(user.id, jti, familyId);
  await client.query(`INSERT INTO refresh_tokens (user_id,jti,family_id,token_hash,expires_at)
    VALUES ($1,$2,$3,$4,NOW()+INTERVAL '7 days')`, [user.id, jti, familyId, hashToken(refreshToken)]);
  return { accessToken: await signAccessToken(user), refreshToken, jti, familyId };
}

export async function setRefreshCookie(token: string) {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearRefreshCookie() {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 0 });
}

export async function currentUserId(request: Request) {
  const value = request.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  try { return (await verifyAccessToken(value.slice(7))).sub; } catch { return null; }
}
