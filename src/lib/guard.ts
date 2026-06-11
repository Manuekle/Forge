/**
 * Lightweight input guardrails for untrusted user text that flows into LLM
 * prompts. Not a substitute for a full content filter, but bounds the obvious
 * prompt-injection / oversized-payload surface before text reaches the model.
 */

/** Coerce to string, trim, and hard-cap length. Returns "" for nullish input. */
export function clampText(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

/**
 * Neutralize the most common direct prompt-injection markers so that user text
 * embedded inside a system/grounding block cannot trivially impersonate the
 * orchestrator or escape its delimiter. Conservative on purpose.
 */
export function sanitizeForPrompt(value: unknown, max = 4000): string {
  return clampText(value, max)
    .replace(/```/g, "ʼʼʼ")
    .replace(/^\s*(system|assistant|developer)\s*:/gim, "$1​:")
    .replace(/ignore (all|any|previous|prior) (instructions|prompts)/gi, "[redacted]")
}
