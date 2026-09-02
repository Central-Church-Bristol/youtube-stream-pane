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
    <div className="relative flex h-full items-center justify-center bg-stage">
      <div className="scanlines absolute inset-0 opacity-40" />
      <div className="relative z-10 mx-auto max-w-lg px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className={checking ? "led led-wait size-4" : "led size-4"} />
        </div>
        <p className="text-xs font-semibold tracking-[0.28em] text-mute uppercase">Off air</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Waiting for livestream
        </h1>
        <p className="mt-4 text-base text-mute">
          {channelLabel ? (
            <>
              Watching <span className="text-ink">{channelLabel}</span>
            </>
          ) : (
            "No channel connected"
          )}
        </p>
        <p className="mt-2 text-sm text-mute/80">
          {checking ? "Checking YouTube…" : `Last check ${formatCheckedAt(lastChecked)}`}
        </p>
        {error ? <p className="mt-4 text-sm text-live">{error}</p> : null}
        {warning && !error ? <p className="mt-4 text-xs text-mute">{warning}</p> : null}
      </div>
    </div>
  )
}
