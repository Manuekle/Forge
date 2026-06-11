import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
  trailing?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, trailing, wrapperClassName, ...props }, ref) => {
    const field = (
      <input
        type={type}
        className={cn(
          "h-11 w-full rounded-full bg-surface-2 text-sm text-text-primary placeholder:text-faint outline-none ring-hair transition-all duration-200",
          "focus:ring-hair-strong focus:bg-surface-3",
          icon ? "pl-10 pr-4" : "px-4",
          trailing && "pr-10",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (!icon && !trailing) return field

    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        {field}
        {trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
            {trailing}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
