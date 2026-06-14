import { describe, it, expect, beforeAll } from "vitest"

beforeAll(() => {
  // 32-byte base64 key for deterministic test runs.
  process.env.SECRETS_KEY = Buffer.alloc(32, 7).toString("base64")
})

describe("crypto", () => {
  it("round-trips a secret", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto")
    const plain = "ghp_supersecrettoken_1234567890"
    const sealed = encryptSecret(plain)
    expect(sealed).not.toBe(plain)
    expect(sealed.startsWith("v1:")).toBe(true)
    expect(decryptSecret(sealed)).toBe(plain)
  })

  it("produces different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./crypto")
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"))
  })

  it("passes through legacy plaintext (no v1 prefix)", async () => {
    const { decryptSecret } = await import("./crypto")
    expect(decryptSecret("legacy-plaintext-token")).toBe("legacy-plaintext-token")
  })

  it("returns null for nullish input", async () => {
    const { decryptSecret } = await import("./crypto")
    expect(decryptSecret(null)).toBeNull()
    expect(decryptSecret(undefined)).toBeNull()
  })

  it("rejects tampered ciphertext", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto")
    const sealed = encryptSecret("data")
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "B" : "A")
    expect(() => decryptSecret(tampered)).toThrow()
  })
})
