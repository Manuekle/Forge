import { describe, it, expect } from "vitest"
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password"

describe("password", () => {
  it("hashes and verifies the correct password", async () => {
    const hash = await hashPassword("Sup3rSecret!")
    expect(hash.startsWith("scrypt$")).toBe(true)
    expect(await verifyPassword("Sup3rSecret!", hash)).toBe(true)
  })

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Sup3rSecret!")
    expect(await verifyPassword("wrong", hash)).toBe(false)
  })

  it("rejects against null/garbage stored hashes", async () => {
    expect(await verifyPassword("x", null)).toBe(false)
    expect(await verifyPassword("x", "not-a-hash")).toBe(false)
  })

  it("salts: two hashes of the same password differ", async () => {
    expect(await hashPassword("repeat")).not.toBe(await hashPassword("repeat"))
  })

  it("enforces strength rules", () => {
    expect(validatePasswordStrength("short")).toMatch(/at least/)
    expect(validatePasswordStrength("alllowercase1")).toMatch(/lowercase, uppercase/)
    expect(validatePasswordStrength("ValidPass123")).toBeNull()
  })
})
