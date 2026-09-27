import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getServerConfig } from "../env";

const encoder = new TextEncoder();
const issuer = "crayon";
const audience = "crayon-web";

export type AccessClaims = JWTPayload & { sub: string; type: "access"; username: string };
export type RefreshClaims = JWTPayload & { sub: string; type: "refresh"; jti: string; familyId: string };

export async function signAccessToken(user: { id: string; username: string }) {
  return new SignJWT({ type: "access", username: user.username })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuer(issuer).setAudience(audience)
    .setIssuedAt().setExpirationTime("15m").sign(encoder.encode(getServerConfig().accessSecret));
}

export async function signRefreshToken(userId: string, jti: string, familyId: string) {
  return new SignJWT({ type: "refresh", familyId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(userId).setJti(jti).setIssuer(issuer).setAudience(audience)
    .setIssuedAt().setExpirationTime("7d").sign(encoder.encode(getServerConfig().refreshSecret));
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, encoder.encode(getServerConfig().accessSecret), { issuer, audience });
  if (payload.type !== "access" || !payload.sub) throw new Error("INVALID_ACCESS_TOKEN");
  return payload as AccessClaims;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, encoder.encode(getServerConfig().refreshSecret), { issuer, audience });
  if (payload.type !== "refresh" || !payload.sub || !payload.jti || typeof payload.familyId !== "string") throw new Error("INVALID_REFRESH_TOKEN");
  return payload as RefreshClaims;
}
