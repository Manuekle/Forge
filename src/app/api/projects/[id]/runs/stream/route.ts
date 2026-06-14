import { requireProjectAccess } from "@/lib/api-auth"
import { store } from "@/lib/store"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Server-Sent Events stream for the active run of a project.
 *
 * Replaces client-side 1.5s polling: the browser opens ONE EventSource and the
 * server pushes status + newly-appended execution events as they land, then
 * closes the stream when the run finishes. Server-side reads are debounced and
 * only deltas are sent, cutting both client requests and bytes on the wire.
 *
 * (Server still reads the DB on an interval; swap to Postgres LISTEN/NOTIFY for
 * true push without polling once the DB driver exposes it.)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await requireProjectAccess(id)
  if (!access.ok) return access.response

  const encoder = new TextEncoder()
  const POLL_MS = 1000
  const MAX_MS = 5 * 60_000

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now()
      let sentEvents = 0
      let lastStatus = ""
      let closed = false

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const tick = async () => {
        if (closed) return
        try {
          const runs = await store.getRuns(id)
          const run = runs[0]
          if (!run) {
            send("done", { reason: "no-run" })
            return finish()
          }

          // Push only newly-appended events since the last tick.
          const events = run.events ?? []
          if (events.length > sentEvents) {
            send("events", events.slice(sentEvents))
            sentEvents = events.length
          }
          if (run.status !== lastStatus || run.progress) {
            lastStatus = run.status
            send("status", { id: run.id, status: run.status, progress: run.progress })
          }

          if (run.status === "completed" || run.status === "failed") {
            send("done", { status: run.status })
            return finish()
          }
        } catch {
          // transient read error — keep the stream alive, try again next tick
        }

        if (Date.now() - startedAt > MAX_MS) {
          send("done", { reason: "timeout" })
          return finish()
        }
        timer = setTimeout(tick, POLL_MS)
      }

      let timer: ReturnType<typeof setTimeout>
      const finish = () => {
        if (closed) return
        closed = true
        clearTimeout(timer)
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }

      // Heartbeat so proxies don't drop an idle connection.
      send("open", { ok: true })
      timer = setTimeout(tick, 0)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
