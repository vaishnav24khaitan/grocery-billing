import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";

function getAdminPassword(): string {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) {
    throw new Error(
      "Please define the ADMIN_PASSWORD environment variable inside .env.local"
    );
  }
  return pwd;
}

/**
 * The session token is an HMAC of a fixed message keyed by the admin password.
 * It never contains the password itself, and can only be produced by someone
 * who knows the password. Rotating ADMIN_PASSWORD invalidates old sessions.
 */
function expectedToken(): string {
  return createHmac("sha256", getAdminPassword())
    .update("grocery-admin-session")
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Verify a plaintext password submitted at login. */
export function verifyPassword(candidate: string): boolean {
  return safeEqual(candidate, getAdminPassword());
}

export async function createAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Returns true if the current request carries a valid admin session cookie. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEqual(token, expectedToken());
}
