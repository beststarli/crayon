import { apiError, handleApiError } from "@/lib/api";
import { currentUserId, clearRefreshCookie } from "@/lib/auth/session";
import { transaction } from "@/lib/db";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";
import { NextResponse } from "next/server";
export async function PATCH(request: Request) {
  const userId = await currentUserId(request); if (!userId) return apiError("未登录",401,"UNAUTHORIZED");
  try {
    const body = await request.json(); const next = String(body.newPassword ?? "");
    if (validatePassword(next)) return apiError(validatePassword(next)!);
    if (next !== body.confirmPassword) return apiError("两次输入的密码不一致");
    await transaction(async client => {
      const found = await client.query("SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",[userId]);
      if (!found.rows[0] || !(await verifyPassword(String(body.currentPassword ?? ""),found.rows[0].password_hash))) throw new Error("WRONG_PASSWORD");
      await client.query("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2",[await hashPassword(next),userId]);
      await client.query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE user_id=$1",[userId]);
    });
    await clearRefreshCookie(); return NextResponse.json({ ok:true, reauthenticate:true });
  } catch (error) { if (error instanceof Error && error.message === "WRONG_PASSWORD") return apiError("当前密码错误",403,"WRONG_PASSWORD"); return handleApiError(error); }
}
