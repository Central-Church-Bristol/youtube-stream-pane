import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm text-[13px] transition-colors outline-none disabled:pointer-events-none disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-blue/70",
  {
    variants: {
      variant: {
        default: "border border-white/20 bg-panel-2 text-ink hover:bg-[#666666]",
        live: "border border-blue bg-panel-2 text-ink hover:bg-[#666666]",
        ghost: "bg-transparent text-ink hover:bg-white/10",
        outline: "border border-white/20 bg-inset text-ink hover:bg-panel-2",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
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
