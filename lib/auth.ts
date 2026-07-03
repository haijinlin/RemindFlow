export const sessionCookieName = "remindflow_session";

export function authPassword() {
  return process.env.REMINDFLOW_APP_PASSWORD?.trim() ?? "";
}

export function authSecret() {
  return process.env.AUTH_SECRET?.trim() || process.env.CRON_SECRET?.trim() || "";
}

export function isAuthConfigured() {
  return Boolean(authPassword() && authSecret());
}

export async function sessionToken() {
  const password = authPassword();
  const secret = authSecret();

  if (!password || !secret) return "";

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(password));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidSession(token: string | undefined) {
  if (!isAuthConfigured()) return process.env.NODE_ENV !== "production";
  if (!token) return false;

  return token === (await sessionToken());
}
