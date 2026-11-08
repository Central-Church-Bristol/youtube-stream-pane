import { formatCheckedAt } from "@/lib/live"

type WaitingScreenProps = {
  channelLabel: string
  checking: boolean
  lastChecked: string | null
  warning: string | null
  error: string | null
}

export function WaitingScreen({
  channelLabel,
  checking,
  lastChecked,
  warning,
  error,
}: WaitingScreenProps) {
  return (
    <div className="relative flex h-full items-center justify-center bg-black">
      <div className="relative z-10 mx-auto max-w-lg px-6 text-center">
        <div className="mb-5 flex justify-center">
          <div className={checking ? "led led-wait" : "led"} />
        </div>
        <p className="text-[13px] text-mute">Off air</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Waiting for livestream</h1>
        <p className="mt-3 text-[13px] text-mute">
          {channelLabel ? (
            <>
              Watching <span className="text-ink">{channelLabel}</span>
            </>
          ) : (
            "No channel connected"
          )}
        </p>
        <p className="mt-1 text-[13px] text-mute">
          {checking ? "Checking YouTube…" : `Last check ${formatCheckedAt(lastChecked)}`}
        </p>
        {error ? <p className="mt-4 text-sm text-live">{error}</p> : null}
        {warning && !error ? <p className="mt-4 text-xs text-mute">{warning}</p> : null}
      </div>
    </div>
  )
}
