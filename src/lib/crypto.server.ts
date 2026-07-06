// Server-only helpers for encrypting Meta/Google access tokens at rest,
// and for signing short-lived OAuth state tokens.
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  // Derive a 32-byte key by hashing whatever length the secret is.
  return createHmac("sha256", "lovable-token-key-v1").update(raw).digest();
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${b64urlEncode(iv)}.${b64urlEncode(tag)}.${b64urlEncode(enc)}`;
}

export function decryptToken(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid ciphertext");
  const iv = b64urlDecode(parts[1]);
  const tag = b64urlDecode(parts[2]);
  const enc = b64urlDecode(parts[3]);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// Signed OAuth state token (HMAC): payload is arbitrary JSON.
export function signState(payload: Record<string, unknown>, ttlSeconds = 600): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const bodyB64 = b64urlEncode(Buffer.from(JSON.stringify(body), "utf8"));
  const sig = createHmac("sha256", getKey()).update(bodyB64).digest();
  return `${bodyB64}.${b64urlEncode(sig)}`;
}

export function verifyState<T = Record<string, unknown>>(state: string): T {
  const [bodyB64, sigB64] = state.split(".");
  if (!bodyB64 || !sigB64) throw new Error("Invalid state");
  const expected = createHmac("sha256", getKey()).update(bodyB64).digest();
  const given = b64urlDecode(sigB64);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw new Error("Invalid state signature");
  }
  const body = JSON.parse(b64urlDecode(bodyB64).toString("utf8")) as { exp?: number } & T;
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("State expired");
  }
  return body as T;
}
