import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const STAFF_COOKIE = "staff_session";

/**
 * The staff session is signed with an HMAC keyed by ADMIN_PASSWORD, so the
 * cookie can only be forged by someone who knows the admin password. Rotating
 * ADMIN_PASSWORD invalidates all outstanding staff sessions.
 */
function getSessionSecret(): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "Please define the ADMIN_PASSWORD environment variable inside .env.local"
    );
  }
  return secret;
}

function sign(staffId: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(`staff:${staffId}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Hash a plaintext password as "salt:hash" using scrypt. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verify a plaintext password against a stored "salt:hash" value. */
export function verifyStaffPassword(plain: string, stored: string): boolean {
  const [salt, hash] = (stored ?? "").split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(plain, salt, 64);
  if (expected.length !== candidate.length) return false;
  return timingSafeEqual(expected, candidate);
}

export async function createStaffSession(staffId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_COOKIE, `${staffId}.${sign(staffId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

export async function destroyStaffSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_COOKIE);
}

/**
 * Returns the staff id carried by a valid, correctly-signed session cookie,
 * or null if there is no valid staff session.
 */
export async function getStaffIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STAFF_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx <= 0) return null;
  const id = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!safeEqual(sig, sign(id))) return null;
  return id;
}
