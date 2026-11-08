import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/cn"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[18px] w-8 shrink-0 cursor-pointer items-center rounded-full border border-white/25 bg-inset transition-colors data-[state=checked]:border-blue data-[state=checked]:bg-blue",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-3.5 translate-x-0.5 rounded-full bg-[#d0d0d0] transition-transform data-[state=checked]:translate-x-[14px] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
