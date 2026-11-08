import * as React from "react"
import { cn } from "@/lib/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-sm border border-white/25 bg-inset px-3 text-[13px] text-ink outline-none placeholder:text-mute focus:border-blue focus:ring-2 focus:ring-blue/40",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
