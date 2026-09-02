import * as React from "react"
import { cn } from "@/lib/cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-xs font-medium tracking-wide text-mute", className)} {...props} />
}

export { Label }
