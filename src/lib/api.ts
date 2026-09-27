import { NextResponse } from "next/server";

export function apiError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: message, code }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
    return apiError("PostgreSQL 尚未配置，请设置 DATABASE_URL", 503, "DATABASE_NOT_CONFIGURED");
  }
  console.error(error);
  return apiError("服务暂时不可用", 500, "INTERNAL_ERROR");
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}
