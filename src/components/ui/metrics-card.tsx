import { Card } from "@/components/ui/card"
import { ArrowUp01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Icon } from "./icon"
import type { MetricCard as MetricCardType } from "@/types"

interface MetricsCardProps {
  data: MetricCardType
}

function MetricsCard({ data }: MetricsCardProps) {
  const changeColor =
    data.changeType === "positive"
      ? "text-success"
      : data.changeType === "negative"
        ? "text-error"
        : "text-muted"

  return (
    <Card variant="elevated" className="group relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.07] blur-xl transition-opacity duration-500 group-hover:opacity-[0.14]"
        style={{ background: "radial-gradient(circle, #E85002 0%, transparent 70%)" }}
      />
      <div className="relative">
        <div className="text-[11px] font-medium text-muted">{data.label}</div>
        <div
          className="mt-3 text-[34px] font-bold leading-none tracking-tight text-text-primary tabular-nums"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          {data.value}
        </div>
        {data.change && (
          <div className={`mt-2.5 flex items-center gap-1 text-xs font-medium ${changeColor}`}>
            {data.changeType === "positive" && <Icon icon={ArrowUp01Icon} size={12} />}
            {data.changeType === "negative" && <Icon icon={ArrowDown01Icon} size={12} />}
            {data.change}
          </div>
        )}
      </div>
    </Card>
  )
}

export { MetricsCard }
