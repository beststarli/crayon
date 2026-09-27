import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
export async function PATCH(request: Request) {
  const userId = await currentUserId(request); if (!userId) return apiError("未登录",401,"UNAUTHORIZED");
  try {
    const nickname = String((await request.json()).nickname ?? "").trim();
    if (nickname.length < 2 || nickname.length > 50) return apiError("昵称长度需为 2–50 个字符");
    const result = await query(`UPDATE users SET nickname=$1,updated_at=NOW() WHERE id=$2 RETURNING id,username,nickname,avatar_object_id AS "avatarObjectId"`, [nickname,userId]);
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) { return handleApiError(error); }
}
