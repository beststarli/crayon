import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { apiError, handleApiError } from "@/lib/api";
import { hashPassword, normalizeUsername, validatePassword, validateUsername } from "@/lib/auth/password";
import { issueSession, setRefreshCookie } from "@/lib/auth/session";

type RegisteredUser={id:string;username:string;nickname?:string|null;avatarObjectId?:string|null};
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (validateUsername(username)) return apiError(validateUsername(username)!);
    if (validatePassword(password)) return apiError(validatePassword(password)!);
    if (password !== body.confirmPassword) return apiError("两次输入的密码不一致");
    const result = await transaction(async (client) => {
      const passwordHash = await hashPassword(password);
      const inserted = await client.query<RegisteredUser>(`INSERT INTO users(username,username_normalized,nickname,password_hash)
        VALUES($1,$2,$1,$3) RETURNING id,username,nickname,avatar_object_id AS "avatarObjectId"`, [username, normalizeUsername(username), passwordHash]);
      const user = inserted.rows[0];
      return { user, ...(await issueSession(client, user)) };
    });
    await setRefreshCookie(result.refreshToken);
    return NextResponse.json({ user: result.user, accessToken: result.accessToken }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") return apiError("该用户名已被使用", 409, "USERNAME_TAKEN");
    return handleApiError(error);
  }
}
