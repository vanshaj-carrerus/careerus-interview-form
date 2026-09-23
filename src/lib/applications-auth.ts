/**
 * Session helpers for gating /applications behind a login form instead of
 * the browser's native HTTP Basic Auth dialog. Uses a signed, expiring
 * cookie so it works from both the Edge proxy and Node API routes without
 * any server-side session storage.
 */
const COOKIE_NAME = "applications_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getExpectedCredentials() {
  return {
    username: process.env.APPLICATIONS_AUTH_USERNAME?.trim() || "hiring@cus",
    password:
      process.env.APPLICATIONS_AUTH_PASSWORD?.trim() || "pass_cus@hiring_321",
  };
}

function getSessionSecret() {
  return (
    process.env.APPLICATIONS_AUTH_SECRET?.trim() ||
    getExpectedCredentials().password
  );
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return toHex(signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function checkCredentials(username: string, password: string): boolean {
  const expected = getExpectedCredentials();
  return (
    timingSafeEqual(username, expected.username) &&
    timingSafeEqual(password, expected.password)
  );
}

export async function createSessionToken(username: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const encodedPayload = btoa(JSON.stringify({ u: username, exp: expiresAt }));
  const signature = await sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const encodedPayload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expectedSignature = await sign(encodedPayload);
  if (!timingSafeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(atob(encodedPayload)) as {
      u?: string;
      exp?: number;
    };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export const APPLICATIONS_SESSION_COOKIE = COOKIE_NAME;
export const APPLICATIONS_SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;
