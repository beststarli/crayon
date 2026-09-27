import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/api";
import { query } from "@/lib/db";
import { REFRESH_COOKIE, clearRefreshCookie, hashToken } from "@/lib/auth/session";
export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return NextResponse.json({ error: "请求来源无效" }, { status: 403 });
  const token = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (token) await query("UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE token_hash=$1", [hashToken(token)]).catch(() => undefined);
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
