/**
 * Symmetric encryption for secrets at rest (integration tokens, etc.).
 *
 * Algorithm: AES-256-GCM (authenticated encryption — confidentiality + integrity).
 * Format:    "v1:<iv>:<authTag>:<ciphertext>"  (all base64url)
 *
 * The version prefix lets us rotate algorithms later and lets `decryptSecret`
 * pass through legacy plaintext values written before encryption existed —
 * so enabling encryption is a non-breaking, forward-only migration.
 *
 * Key resolution (first that yields 32 bytes wins):
 *   1. SECRETS_KEY      — 32-byte key, base64 or hex (recommended; rotate-able)
 *   2. AUTH_SECRET      — any length; stretched to 32 bytes via scrypt
 * Refuses to encrypt with no key configured (fail closed, never store plaintext
 * silently when the caller expected encryption).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

const VERSION = "v1"
const ALGO = "aes-256-gcm"
const IV_BYTES = 12 // GCM standard nonce length

let cachedKey: Buffer | null | undefined

/** Resolve (and cache) the 32-byte data-encryption key, or null if unconfigured. */
function getKey(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey

  const raw = process.env.SECRETS_KEY?.trim()
  if (raw) {
    const buf = decodeKeyMaterial(raw)
    if (buf.length === 32) return (cachedKey = buf)
    throw new Error(`SECRETS_KEY must decode to 32 bytes (got ${buf.length})`)
  }

  const authSecret = process.env.AUTH_SECRET?.trim()
  if (authSecret) {
    // Deterministic stretch so the same AUTH_SECRET always yields the same key.
    // Fixed salt is acceptable here: AUTH_SECRET is already high-entropy.
    return (cachedKey = scryptSync(authSecret, "forge.secrets.v1", 32))
  }

  return (cachedKey = null)
}

function decodeKeyMaterial(raw: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex")
  return Buffer.from(raw, "base64")
}

/** True when a key is configured and encryption is possible. */
export function encryptionAvailable(): boolean {
  return getKey() !== null
}

/**
 * Encrypt a plaintext secret. Returns a self-describing "v1:..." string.
 * Throws if no key is configured — callers must not silently persist plaintext.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey()
  if (!key) {
    throw new Error("Cannot encrypt: set SECRETS_KEY (or AUTH_SECRET) in the environment")
  }
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, b64(iv), b64(tag), b64(ciphertext)].join(":")
}

/**
 * Decrypt a value produced by `encryptSecret`. Values without the "v1:" prefix
 * are treated as legacy plaintext and returned unchanged (backward compat).
 * Returns null for nullish input; throws only on tampered/corrupt ciphertext.
 */
export function decryptSecret(value: string | null | undefined): string | null {
  if (value == null) return null
  if (!value.startsWith(`${VERSION}:`)) return value // legacy plaintext

  const key = getKey()
  if (!key) throw new Error("Cannot decrypt: encryption key is not configured")

  const parts = value.split(":")
  if (parts.length !== 4) throw new Error("Malformed ciphertext")
  const [, ivB64, tagB64, dataB64] = parts
  const decipher = createDecipheriv(ALGO, key, ub64(ivB64))
  decipher.setAuthTag(ub64(tagB64))
  return Buffer.concat([decipher.update(ub64(dataB64)), decipher.final()]).toString("utf8")
}

const b64 = (b: Buffer) => b.toString("base64url")
const ub64 = (s: string) => Buffer.from(s, "base64url")
