import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-live/60",
  {
    variants: {
      variant: {
        default: "bg-ink text-stage hover:bg-white",
        live: "bg-live text-white hover:bg-[#c31322]",
        ghost: "bg-transparent text-ink hover:bg-white/8",
        outline: "border border-line bg-panel text-ink hover:bg-panel-2",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button }
