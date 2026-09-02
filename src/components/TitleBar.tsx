import { Settings, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

type TitleBarProps = {
  visible: boolean
  live: boolean
  channelLabel: string
  muted: boolean
  onToggleMute: () => void
  onOpenSettings: () => void
  onPointerActive: () => void
  onPointerIdle: () => void
}

export function TitleBar({
  visible,
  live,
  channelLabel,
  muted,
  onToggleMute,
  onOpenSettings,
  onPointerActive,
  onPointerIdle,
}: TitleBarProps) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-30 flex h-11 items-center justify-between bg-gradient-to-b from-black/80 via-black/45 to-transparent px-2 transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
      onMouseEnter={onPointerActive}
      onMouseLeave={onPointerIdle}
      onFocusCapture={onPointerActive}
    >
      <div className="drag-region flex min-w-0 flex-1 items-center gap-2 px-1">
        <div className={cn("led", live ? "led-on" : "led-wait")} />
        <span className="truncate text-xs font-medium tracking-wide text-ink/90">
          Live Pane
          {channelLabel ? <span className="text-mute"> · {channelLabel}</span> : null}
        </span>
      </div>
      <div className="no-drag flex items-center gap-0.5">
        <Button size="icon" variant="ghost" onClick={onToggleMute} title={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onOpenSettings} title="Settings">
          <Settings className="size-4" />
        </Button>
      </div>
    </div>
  )
}
