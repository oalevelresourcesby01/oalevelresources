import jwt from "jsonwebtoken";
import { getConfig, setConfig } from "./config";

export interface AdminPayload {
  username: string;
  role: string;
  /** Monotonic counter — incremented on logout and password change to invalidate prior tokens */
  ver: number;
}

async function getSecret(): Promise<string> {
  const secret = await getConfig("jwtSecret");
  if (!secret) throw new Error("JWT secret not configured");
  return secret;
}

/** Read (and lazily initialise) the current token version from DB config */
export async function getTokenVersion(): Promise<number> {
  const raw = await getConfig("jwtVersion");
  return raw ? parseInt(raw, 10) : 0;
}

/** Increment the token version — call on logout and password change */
export async function bumpTokenVersion(): Promise<number> {
  const next = (await getTokenVersion()) + 1;
  await setConfig("jwtVersion", String(next));
  return next;
}

export async function signToken(
  payload: Omit<AdminPayload, "ver">
): Promise<string> {
  const [secret, ver] = await Promise.all([getSecret(), getTokenVersion()]);
  return jwt.sign({ ...payload, ver }, secret, { expiresIn: "7d" });
}

export async function verifyToken(token: string): Promise<AdminPayload> {
  const secret = await getSecret();
  const payload = jwt.verify(token, secret) as AdminPayload;
  const currentVer = await getTokenVersion();
  if (payload.ver !== currentVer) {
    throw new Error("Token has been revoked");
  }
  return payload;
}

export function decodeToken(token: string): AdminPayload | null {
  try {
    return jwt.decode(token) as AdminPayload;
  } catch {
    return null;
  }
}
