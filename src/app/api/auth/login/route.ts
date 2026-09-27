import { NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { normalizeUsername, verifyPassword } from "@/lib/auth/password";
import { issueSession, setRefreshCookie } from "@/lib/auth/session";
type LoginUser={id:string;username:string;nickname?:string|null;password_hash:string;avatarObjectId?:string|null;status:string};
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const found = await query<LoginUser>(`SELECT id,username,nickname,password_hash,avatar_object_id AS "avatarObjectId",status FROM users WHERE username_normalized=$1`, [normalizeUsername(String(body.username ?? ""))]);
    const user = found.rows[0];
    if (!user || user.status !== "active" || !(await verifyPassword(String(body.password ?? ""), user.password_hash))) return apiError("用户名或密码错误", 401, "INVALID_CREDENTIALS");
    const session = await transaction((client) => issueSession(client, user));
    await setRefreshCookie(session.refreshToken);
    return NextResponse.json({ accessToken: session.accessToken, user: { id: user.id, username: user.username, nickname: user.nickname, avatarObjectId: user.avatarObjectId } });
  } catch (error) { return handleApiError(error); }
}
