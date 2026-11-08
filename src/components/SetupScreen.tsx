import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SetupScreenProps = {
  initialValue: string
  busy: boolean
  error: string | null
  onSubmit: (channel: string) => void
}

export function SetupScreen({ initialValue, busy, error, onSubmit }: SetupScreenProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="flex h-full flex-col bg-panel">
      <div className="drag-region flex h-9 shrink-0 items-center gap-2 border-b border-black bg-header px-3">
        <div className="led led-wait" />
        <span className="text-[13px] text-ink">Live Pane</span>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-8 sm:px-10">
        <p className="text-sm text-mute">Fourth square of the 2×2</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          Show the YouTube livestream in the empty grid cell.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
          Paste your church channel. When that channel goes live, this window switches to the
          stream by itself. Sit it over the gap in your ProPresenter multiview and leave it
          running.
        </p>

        <form
          className="no-drag mt-8 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(value.trim())
          }}
        >
          <Label htmlFor="channel">YouTube channel</Label>
          <Input
            id="channel"
            autoFocus
            value={value}
            placeholder="youtube.com/@yourchurch  or  @yourchurch"
            onChange={(event) => setValue(event.target.value)}
          />
          {error ? <p className="text-sm text-live">{error}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" variant="live" disabled={busy || !value.trim()}>
              {busy ? "Checking…" : "Watch this channel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setValue("@NASA")
                onSubmit("@NASA")
              }}
            >
              Test with NASA (often live)
            </Button>
          </div>
        </form>

        <p className="mt-8 text-xs leading-relaxed text-mute/80">
          Studio path if you need the ID: YouTube Studio → Settings → Channel → Advanced. Channel
          IDs start with UC. Handles like @yourchurch work too.
        </p>
      </div>
    </div>
  )
}
