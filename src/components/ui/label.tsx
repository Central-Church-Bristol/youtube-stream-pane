import * as React from "react"
import { cn } from "@/lib/cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] text-ink", className)} {...props} />
}

export { Label }
