/**
 * Password hashing using scrypt (Node built-in — no external dependency, memory-
 * hard, recommended by OWASP). Format: "scrypt$N$r$p$<salt>$<hash>" so cost
 * parameters travel with the hash and can be upgraded without breaking old rows.
 *
 * Verification is constant-time (timingSafeEqual) to avoid timing oracles.
 */
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto"
import { promisify } from "util"

type ScryptOpts = { N: number; r: number; p: number; maxmem: number }
const scrypt = promisify(_scrypt) as (pw: string | Buffer, salt: Buffer, keylen: number, opts: ScryptOpts) => Promise<Buffer>

// Cost params: N=2^15 (~32MB), interactive-login appropriate.
const N = 32768
const r = 8
const p = 1
const KEYLEN = 64
// 128 * N * r ≈ 33.5MB; default maxmem is 32MB, so raise the ceiling.
const MAXMEM = 64 * 1024 * 1024

export const PASSWORD_MIN_LENGTH = 10

/** Hash a plaintext password into a self-describing, storable string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEYLEN, { N, r, p, maxmem: MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${derived.toString("base64")}`
}

/** Verify a plaintext password against a stored hash. Never throws. */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  try {
    const [scheme, sN, sr, sp, saltB64, hashB64] = stored.split("$")
    if (scheme !== "scrypt") return false
    const salt = Buffer.from(saltB64, "base64")
    const expected = Buffer.from(hashB64, "base64")
    const derived = await scrypt(password, salt, expected.length, { N: Number(sN), r: Number(sr), p: Number(sp), maxmem: MAXMEM })
    return derived.length === expected.length && timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

/** Validate password strength. Returns an error message, or null if acceptable. */
export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include lowercase, uppercase, and a number"
  }
  return null
}
