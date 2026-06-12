export const adminSessionCookie = "mio-admin-session";

export type AdminRole = "owner" | "admin" | "manager" | "content_manager";

export type AdminSession = {
  userId: string;
  adminUserId: number | string;
  role: AdminRole;
  expiresAt: number;
  issuedAt: number;
  version: 1;
};

const encoder = new TextEncoder();
const maxAgeSeconds = 60 * 60 * 8;

function base64UrlEncode(value: string) {
  const bytes = encoder.encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function getSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

async function getSigningKey() {
  const secret = getSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function adminSessionMaxAgeSeconds() {
  return maxAgeSeconds;
}

export function createAdminSession(input: Omit<AdminSession, "expiresAt" | "issuedAt" | "version">) {
  const now = Math.floor(Date.now() / 1000);

  return {
    ...input,
    issuedAt: now,
    expiresAt: now + maxAgeSeconds,
    version: 1 as const,
  };
}

export async function sealAdminSession(session: AdminSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await signPayload(payload);

  return `${payload}.${signature}`;
}

export async function verifyAdminSessionCookie(value: string | undefined) {
  if (!value) return null;

  const [payload, signature] = value.split(".");

  if (!payload || !signature) return null;

  const expected = await signPayload(payload);

  if (signature !== expected) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as AdminSession;

    if (
      session.version !== 1 ||
      !session.userId ||
      !session.adminUserId ||
      !session.role ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
