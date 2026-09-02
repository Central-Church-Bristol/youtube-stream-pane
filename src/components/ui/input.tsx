import * as React from "react"
import { cn } from "@/lib/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-line bg-stage px-3 text-sm text-ink outline-none placeholder:text-mute/70 focus:border-ink/30 focus:ring-2 focus:ring-live/30",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
