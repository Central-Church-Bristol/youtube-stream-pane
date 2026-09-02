import { useEffect, useRef } from "react"
import type { YtNamespace, YtPlayer } from "@/lib/types"

let apiPromise: Promise<YtNamespace> | null = null

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-yt-api]")
    if (!existing) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      tag.dataset.ytApi = "true"
      tag.onerror = () => reject(new Error("Could not load YouTube player"))
      document.head.appendChild(tag)
    }
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
      else reject(new Error("YouTube player missing"))
    }
    if (window.YT?.Player) resolve(window.YT)
  })
  return apiPromise
}

type LivePlayerProps = {
  videoId: string
  muted: boolean
  showControls: boolean
  captureAudio: boolean
  onEnded: () => void
  onError: () => void
}

export function LivePlayer({
  videoId,
  muted,
  showControls,
  captureAudio,
  onEnded,
  onError,
}: LivePlayerProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const mutedRef = useRef(muted)
  const onEndedRef = useRef(onEnded)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => {
    onEndedRef.current = onEnded
    onErrorRef.current = onError
  }, [onEnded, onError])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const host = document.createElement("div")
    host.className = "yt-host h-full w-full"
    box.appendChild(host)
    let cancelled = false

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        playerRef.current = new YT.Player(host, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            autoplay: 1,
            mute: mutedRef.current && !captureAudio ? 1 : 0,
            controls: showControls ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (mutedRef.current && !captureAudio) event.target.mute()
              else event.target.unMute()
              event.target.playVideo()
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED) onEndedRef.current()
            },
            onError: () => onErrorRef.current(),
          },
        })
      })
      .catch(() => onErrorRef.current())

    return () => {
      cancelled = true
      playerRef.current?.destroy()
      playerRef.current = null
      host.remove()
    }
  }, [videoId, showControls, captureAudio])

  useEffect(() => {
    const player = playerRef.current
    if (!player?.mute) return
    if (muted && !captureAudio) player.mute()
    else player.unMute()
  }, [muted, captureAudio])

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={boxRef} className="yt-host h-full w-full" />
      <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1">
        <span className="led led-on" />
        <span className="text-[11px] font-semibold tracking-[0.18em] text-white uppercase">
          Live
        </span>
      </div>
    </div>
  )
}
