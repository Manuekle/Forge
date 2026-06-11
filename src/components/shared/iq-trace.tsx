import { Zap } from "lucide-react"

interface IqTraceProps {
  className?: string
}

// Illustrative sample trace for marketing surfaces. Live runs render the real
// trace + grounded citations in the project workspace (Foundry IQ tab).
const traces = [
  { time: "+0.00s", action: "iq.intent.parse", detail: "marketplace / food / p2p" },
  { time: "+0.36s", action: "iq.knowledge.retrieve", detail: "3 sources · grounded" },
  { time: "+1.03s", action: "orchestrator.delegate", detail: "6 agents · sequential" },
  { time: "+14.20s", action: "debate.open", detail: "buyer-authentication" },
  { time: "+21.77s", action: "vote.tally", detail: "consensus" },
  { time: "+21.90s", action: "consensus.emit", detail: "confidence 0.87" },
  { time: "+27.66s", action: "run.complete", detail: "7 artifacts" },
]

export function IqTrace({ className }: IqTraceProps) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] bg-surface-inset p-6 ring-hair ${className || ""}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,80,2,0.05)_0%,transparent_60%)]" />
      <div className="relative">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full gradient-brand glow-brand">
            <Zap size={12} className="text-white" />
          </div>
          <span className="font-mono text-xs text-text-secondary">Foundry IQ Trace — Run</span>
        </div>
        <div className="flex flex-col gap-0.5 font-mono text-xs">
          {traces.map((t, i) => (
            <div key={i} className="relative -ml-px flex gap-4 border-l border-white/[0.08] py-1 pl-4">
              <div className="absolute left-[-3.5px] top-2 h-[6px] w-[6px] rounded-full"
                style={{ backgroundColor: t.action.includes("consensus") || t.action.includes("complete") ? "#E85002" : "rgba(255,255,255,0.15)" }} />
              <span className="text-brand w-[65px] flex-shrink-0">{t.time}</span>
              <span className="text-text-secondary w-[160px] flex-shrink-0">{t.action}</span>
              <span className="text-muted whitespace-nowrap">{t.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
