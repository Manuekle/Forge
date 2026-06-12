import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none",
  {
    variants: {
      variant: {
        active: "bg-success/12 text-success",
        planning: "bg-info/12 text-info",
        in_review: "bg-warning/12 text-warning",
        approved: "bg-brand-subtle text-brand",
        archived: "bg-hover-strong text-muted",
        consensus: "bg-success/12 text-success",
        voting: "bg-warning/12 text-warning",
        open: "bg-info/12 text-info",
        default: "bg-brand-subtle text-brand",
        neutral: "bg-hover-strong text-text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

const dotColor: Record<string, string> = {
  active: "bg-success",
  consensus: "bg-success",
  planning: "bg-info",
  open: "bg-info",
  in_review: "bg-warning",
  voting: "bg-warning",
  approved: "bg-brand",
  archived: "bg-muted",
  default: "bg-brand",
  neutral: "bg-muted",
}

const autoLabel: Record<string, string> = {
  active: "Active",
  planning: "Planning",
  in_review: "In review",
  approved: "Approved",
  archived: "Archived",
  consensus: "Consensus",
  voting: "Voting",
  open: "Open",
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const content = children ?? autoLabel[variant || ""] ?? null
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[variant || "default"])} />
      )}
      {content}
    </span>
  )
}

export { Badge, badgeVariants }
