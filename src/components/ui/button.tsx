import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary: "btn-brand text-brand-fg sheen",
        secondary:
          "bg-surface-2 text-text-primary ring-hair hover:bg-surface-3 hover:text-text-primary lift-1",
        ghost:
          "text-text-secondary hover:text-text-primary hover:bg-hover-strong",
        outline:
          "text-text-secondary ring-hair hover:text-text-primary hover:ring-hair-strong hover:bg-hover",
        danger:
          "bg-error/15 text-error ring-hair hover:bg-error/25",
      },
      size: {
        sm: "h-8 px-3.5 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-sm",
        xl: "h-13 px-8 text-base",
        icon: "h-9 w-9 px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
