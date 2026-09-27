import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "walpole_admin";

export function adminCookieName() {
  return COOKIE;
}

export function adminPassword(): string {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production") return "";
  return "walpole-dip";
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || adminPassword() || "walpole-dev-session";
}

export function passwordMatches(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function signSession(): string {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = `v1.${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function sessionIsValid(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, exp, sig] = parts;
  if (version !== "v1") return false;
  const payload = `${version}.${exp}`;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expiry = Number(exp);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function usingDevPassword(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD;
}
