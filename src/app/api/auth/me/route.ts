import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { currentUserId } from "@/lib/auth/session";
import { query } from "@/lib/db";
export async function GET(request: Request) {
  const userId = await currentUserId(request);
  if (!userId) return apiError("未登录", 401, "UNAUTHORIZED");
  try {
    const result = await query(`SELECT id,username,nickname,avatar_object_id AS "avatarObjectId" FROM users WHERE id=$1 AND status='active'`, [userId]);
    if (!result.rows[0]) return apiError("用户不存在", 404);
    return NextResponse.json({ user: result.rows[0] });
  } catch (error) { return handleApiError(error); }
}
