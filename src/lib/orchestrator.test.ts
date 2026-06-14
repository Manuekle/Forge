import { describe, it, expect } from "vitest"
import { extractJson, parseAgentOutput, tallyConfidence } from "./orchestrator"
import type { AgentVote } from "./orchestrator"

describe("extractJson", () => {
  it("extracts a balanced object ignoring surrounding prose", () => {
    expect(extractJson('here is json: {"a":1,"b":[2,3]} trailing')).toEqual({ a: 1, b: [2, 3] })
  })
  it("extracts an array", () => {
    expect(extractJson('result = [{"x":1}]')).toEqual([{ x: 1 }])
  })
  it("handles braces inside strings", () => {
    expect(extractJson('{"k":"a } b"}')).toEqual({ k: "a } b" })
  })
  it("returns null when there is no JSON", () => {
    expect(extractJson("no json here")).toBeNull()
  })
  it("returns null on malformed JSON", () => {
    expect(extractJson("{ not valid")).toBeNull()
  })
})

describe("parseAgentOutput", () => {
  it("parses vote, confidence and concerns; strips the vote block from the body", () => {
    const raw = `My analysis here.\n---VOTE---\nVOTE: approve_with_concerns\nCONFIDENCE: 0.82\nCONCERNS: timeline is tight`
    const p = parseAgentOutput(raw)
    expect(p.vote).toBe("approve_with_concerns")
    expect(p.confidence).toBeCloseTo(0.82)
    expect(p.concerns).toBe("timeline is tight")
    expect(p.body).toBe("My analysis here.")
  })

  it("normalizes 'approve with concerns' spelling", () => {
    expect(parseAgentOutput("x\n---VOTE---\nVOTE: approve with concerns").vote).toBe("approve_with_concerns")
  })

  it("clamps confidence to [0,1]", () => {
    expect(parseAgentOutput("x\n---VOTE---\nVOTE: approve\nCONFIDENCE: 1.5").confidence).toBe(1)
  })

  it("defaults to abstain without a vote block", () => {
    const p = parseAgentOutput("just text")
    expect(p.vote).toBe("abstain")
    expect(p.confidence).toBeNull()
  })

  it("parses high-severity critiques and ignores invalid targets", () => {
    const raw = `body\n---VOTE---\nVOTE: reject\n---CRITIQUES---\n[{"target":"pm","risk":"no metrics","severity":"high"},{"target":"bogus","risk":"x","severity":"low"}]`
    const p = parseAgentOutput(raw)
    expect(p.critiques).toHaveLength(1)
    expect(p.critiques[0]).toMatchObject({ target: "pm", severity: "high" })
  })

  it("treats 'CONCERNS: none' as no concern", () => {
    expect(parseAgentOutput("x\n---VOTE---\nVOTE: approve\nCONCERNS: none").concerns).toBe("")
  })
})

describe("tallyConfidence", () => {
  const v = (vote: AgentVote["vote"], confidence: number | null = null): AgentVote => ({ vote, confidence, concerns: "", round: 1 })

  it("returns neutral 0.5 when no votes are cast", () => {
    expect(tallyConfidence({}).confidence).toBe(0.5)
  })

  it("scores unanimous approval at 1.0 when no self-confidence reported", () => {
    expect(tallyConfidence({ pm: v("approve"), qa: v("approve") }).confidence).toBe(1)
  })

  it("blends vote score with self-reported confidence (0.7/0.3)", () => {
    // vote score = 1.0, self = 0.5 -> 0.7*1 + 0.3*0.5 = 0.85
    expect(tallyConfidence({ pm: v("approve", 0.5) }).confidence).toBeCloseTo(0.85)
  })

  it("weights rejections far below approvals", () => {
    const approve = tallyConfidence({ a: v("approve") }).confidence
    const reject = tallyConfidence({ a: v("reject") }).confidence
    expect(reject).toBeLessThan(approve)
    expect(reject).toBeLessThan(0.3)
  })

  it("ignores abstentions in the weighted score", () => {
    expect(tallyConfidence({ a: v("approve"), b: v("abstain") }).confidence).toBe(1)
  })
})
