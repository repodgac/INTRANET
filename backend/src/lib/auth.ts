import crypto from "node:crypto";
import { env } from "../config/env";

export type AdminRole = "admin" | "super_admin";

interface TokenPayload {
  uid: number;
  sub: string;
  role: AdminRole;
  exp: number;
}

const header = { alg: "HS256", typ: "JWT" };

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function sign(unsignedToken: string) {
  return crypto
    .createHmac("sha256", env.jwtSecret)
    .update(unsignedToken)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function createAdminToken(input: { id: number; loginName: string; role: AdminRole }) {
  const payload: TokenPayload = {
    uid: input.id,
    sub: input.loginName,
    role: input.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAdminToken(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  if (sign(unsignedToken) !== signature) {
    return null;
  }

  try {
    const parsedHeader = JSON.parse(decodeBase64Url(encodedHeader)) as typeof header;
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload;

    if (parsedHeader.alg !== "HS256" || !["admin", "super_admin"].includes(payload.role)) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
