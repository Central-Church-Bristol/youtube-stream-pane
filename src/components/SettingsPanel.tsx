import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { isDesktopApp, loadWindowState } from "@/lib/desktop"
import type { Quadrant, Settings, WindowState } from "@/lib/types"
import { cn } from "@/lib/cn"

type SettingsPanelProps = {
  open: boolean
  settings: Settings
  channelLabel: string
  onClose: () => void
  onChange: (patch: Partial<Settings>) => void
  onChangeChannel: (channel: string) => void
}

const quadrants: { id: Quadrant; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
]

export function SettingsPanel({
  open,
  settings,
  channelLabel,
  onClose,
  onChange,
  onChangeChannel,
}: SettingsPanelProps) {
  const desktop = isDesktopApp()
  const [windowState, setWindowState] = useState<WindowState | null>(null)
  const [channelDraft, setChannelDraft] = useState(settings.channelInput)
  const [displayId, setDisplayId] = useState<number | undefined>()

  useEffect(() => {
    setChannelDraft(settings.channelInput)
  }, [settings.channelInput])

  useEffect(() => {
    if (!open || !desktop) return
    void loadWindowState().then((state) => {
      setWindowState(state)
      setDisplayId(state?.displays.find((display) => display.primary)?.id)
    })
  }, [open, desktop])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex justify-end bg-black/55">
      <aside className="no-drag flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-black bg-panel">
        <div className="flex items-center justify-between border-b border-black bg-header px-4 py-2">
          <h2 className="text-[15px] font-semibold text-ink">Settings</h2>
          <Button size="icon" variant="ghost" onClick={onClose} title="Close settings">
            <X className="size-4" />
          </Button>
        </div>

        <section className="space-y-3 border-b border-line px-4 py-4">
          <Label htmlFor="settings-channel">YouTube channel</Label>
          <p className="text-xs text-mute">{channelLabel || "Not connected"}</p>
          <Input
            id="settings-channel"
            value={channelDraft}
            onChange={(event) => setChannelDraft(event.target.value)}
            placeholder="@yourchurch"
          />
          <Button
            variant="default"
            size="sm"
            onClick={() => onChangeChannel(channelDraft.trim())}
            disabled={!channelDraft.trim()}
          >
            Save channel
          </Button>
        </section>

        <section className="space-y-4 border-b border-line px-4 py-4">
          <ToggleRow
            label="Mute livestream"
            hint="Stops this PC from playing YouTube sound. Keep on when the room already has house audio. The audio meter can still watch the stream."
            checked={settings.muted}
            onCheckedChange={(checked) => onChange({ muted: checked })}
          />
          <ToggleRow
            label="Audio meter"
            hint="Shows whether the livestream has sound. A No audio warning appears if the stream is silent for more than 3 seconds."
            checked={settings.showAudioMeter}
            onCheckedChange={(checked) => onChange({ showAudioMeter: checked })}
          />
          <ToggleRow
            label="YouTube player controls"
            hint="Off keeps the cell clean. Hover the window anytime for mute and settings."
            checked={settings.showControls}
            onCheckedChange={(checked) => onChange({ showControls: checked })}
          />
          <div>
            <Label htmlFor="poll">Recheck when off-air</Label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="poll"
                type="range"
                min={8}
                max={60}
                value={settings.pollSeconds}
                onChange={(event) => onChange({ pollSeconds: Number(event.target.value) })}
                className="w-full accent-blue"
              />
              <span className="w-12 text-right text-sm text-mute">{settings.pollSeconds}s</span>
            </div>
          </div>
        </section>

        {desktop ? (
          <section className="space-y-4 border-b border-line px-4 py-4">
            <ToggleRow
              label="Always on top"
              hint="Keeps this pane above ProPresenter, including when stage screens open later. Does not steal keyboard focus."
              checked={windowState?.alwaysOnTop ?? true}
              onCheckedChange={(checked) => {
                void window.livePane?.setAlwaysOnTop(checked).then(() =>
                  loadWindowState().then(setWindowState),
                )
              }}
            />
            <ToggleRow
              label="Start when ProPresenter runs"
              hint={
                windowState?.watcherError
                  ? `Could not install the helper: ${windowState.watcherError}`
                  : "A helper waits after you sign in. Live Pane itself does not. When ProPresenter opens, Live Pane appears; when ProPresenter quits, Live Pane closes."
              }
              checked={windowState?.launchWithProPresenter ?? false}
              onCheckedChange={(checked) => {
                void window.livePane?.setLaunchWithProPresenter?.(checked).then(() =>
                  loadWindowState().then(setWindowState),
                )
              }}
            />
            <div>
              <Label htmlFor="display">Snap to a 2×2 cell</Label>
              {windowState && windowState.displays.length > 1 ? (
                <select
                  id="display"
                  className="mt-2 h-9 w-full rounded-sm border border-white/25 bg-inset px-3 text-[13px] text-ink"
                  value={displayId}
                  onChange={(event) => setDisplayId(Number(event.target.value))}
                >
                  {windowState.displays.map((display) => (
                    <option key={display.id} value={display.id}>
                      {display.label}
                      {display.primary ? " (primary)" : ""} · {display.bounds.width}×
                      {display.bounds.height}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {quadrants.map((quadrant) => (
                  <button
                    key={quadrant.id}
                    type="button"
                    onClick={() => void window.livePane?.snapQuadrant(quadrant.id, displayId)}
                    className={cn(
                      "rounded-sm border border-white/20 bg-inset px-3 py-2.5 text-left text-[13px] text-ink hover:border-blue hover:bg-panel-2",
                    )}
                  >
                    {quadrant.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-mute">
                Default is the bottom-right quarter of the chosen screen — the usual leftover cell
                in a 2×2. Drag the edges if your gap is not exactly half.
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-2 border-b border-line px-4 py-4 text-[13px] text-mute">
            <p>
              Browser preview: snap this window into the empty cell yourself. The desktop app adds
              always-on-top, quadrant snap, and ProPresenter-linked launch.
            </p>
          </section>
        )}

        <p className="mt-auto px-4 pt-4 pb-4 text-xs text-mute">
          Live Pane sits in the system tray, not the taskbar. Click the tray icon and choose Quit
          Live Pane when you want the cell back. If ProPresenter-linked launch is on, quitting
          ProPresenter also closes Live Pane.
        </p>
      </aside>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[13px] text-ink">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-mute">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
