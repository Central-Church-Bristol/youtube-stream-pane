import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/cn"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-line bg-stage transition-colors data-[state=checked]:border-live data-[state=checked]:bg-live",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-1 rounded-full bg-mute transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-white" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
