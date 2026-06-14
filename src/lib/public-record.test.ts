import { describe, it, expect } from "vitest"
import { store } from "./store"
import { toPublicRecord, type PublicDecisionRecord } from "./public-record"

describe("public Decision Record sharing", () => {
  it("round-trips a share slug and resolves project context", async () => {
    const project = await store.createProject({ userId: "u-share", name: "Habit Tracker", description: "A daily habit app" })
    const run = await store.createRun(project.id)
    expect(run.shareId).toBeNull()

    await store.setRunShare(run.id, "abc123XYZ")
    const rec = await store.getRunByShareId("abc123XYZ")
    expect(rec).not.toBeNull()
    expect(rec!.shareId).toBe("abc123XYZ")
    expect(rec!.projectName).toBe("Habit Tracker")
    expect(rec!.projectDescription).toBe("A daily habit app")
  })

  it("returns null for an unknown slug", async () => {
    expect(await store.getRunByShareId("does-not-exist")).toBeNull()
  })

  it("unshare clears the slug so the link stops resolving", async () => {
    const project = await store.createProject({ userId: "u-share2", name: "X", description: "" })
    const run = await store.createRun(project.id)
    await store.setRunShare(run.id, "slug-2")
    expect(await store.getRunByShareId("slug-2")).not.toBeNull()
    await store.setRunShare(run.id, null)
    expect(await store.getRunByShareId("slug-2")).toBeNull()
  })

  it("toPublicRecord exposes only vetted fields", async () => {
    const project = await store.createProject({ userId: "u-share3", name: "Forge", description: "desc" })
    const run = await store.createRun(project.id)
    await store.completeRun(run.id, 142, [], [{ ref: "S1", id: "k1", title: "Source", source: "KB", score: 0.9, snippet: "snip" }], {
      confidence: 0.73,
      votes: { pm: { vote: "approve", confidence: 0.8, concerns: "", round: 1 } },
      consensus: "Ship the MVP.",
    })
    await store.setRunShare(run.id, "pub-1")
    const stored = await store.getRunByShareId("pub-1")
    const rec: PublicDecisionRecord = toPublicRecord(stored!)

    expect(rec.confidence).toBe(0.73)
    expect(rec.consensus).toBe("Ship the MVP.")
    expect(rec.durationSeconds).toBe(142)
    expect(rec.votes).toEqual([{ agent: "pm", vote: "approve", confidence: 0.8, concerns: "", round: 1 }])
    expect(rec.citations[0]).toMatchObject({ ref: "S1", title: "Source" })
    // No userId / projectId leaks into the public projection.
    expect(JSON.stringify(rec)).not.toContain(project.id)
    expect(JSON.stringify(rec)).not.toContain("u-share3")
  })
})
