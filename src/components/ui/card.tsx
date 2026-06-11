import { cn } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  /** visual elevation level */
  variant?: "base" | "elevated" | "inset" | "glass"
}

const variantMap = {
  base: "bg-surface lift-1",
  elevated: "bg-surface-2 lift-2",
  inset: "bg-surface-inset ring-hair",
  glass: "bg-surface/70 backdrop-blur-xl lift-2",
}

function Card({ className, hover = false, variant = "base", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] transition-all duration-300",
        variantMap[variant],
        hover &&
          "cursor-pointer hover:bg-surface-2 hover:lift-3 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Card }
