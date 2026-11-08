import { useEffect, useRef, useState } from "react"

const SILENCE_MS = 3000
const SILENCE_RMS = 0.03
const BARS = 10

type ChromeCaptureConstraints = MediaStreamConstraints & {
  audio: { mandatory: { chromeMediaSource: string; chromeMediaSourceId: string } }
  video: {
    mandatory: {
      chromeMediaSource: string
      chromeMediaSourceId: string
      maxWidth: number
      maxHeight: number
    }
  }
}

type AudioMeterProps = {
  active: boolean
  muteSpeakers: boolean
}

export function AudioMeter({ active, muteSpeakers }: AudioMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [silent, setSilent] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!active || !window.livePane?.getMediaSourceId) return

    let cancelled = false
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null
    let frame = 0
    let silentSince: number | null = null

    async function start() {
      const sourceId = await window.livePane!.getMediaSourceId()
      if (cancelled) return
      const constraints: ChromeCaptureConstraints = {
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: sourceId,
          },
        },
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: sourceId,
            maxWidth: 16,
            maxHeight: 16,
          },
        },
      }
      stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (cancelled) return

      await window.livePane?.setSpeakerMuted(muteSpeakers)

      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.7
      source.connect(analyser)
      const bins = new Uint8Array(analyser.frequencyBinCount)

      const draw = (time: number) => {
        if (cancelled) return
        analyser.getByteFrequencyData(bins)
        let sum = 0
        for (const value of bins) sum += value
        const level = sum / bins.length / 255
        if (level < SILENCE_RMS) {
          if (silentSince == null) silentSince = time
          setSilent(time - silentSince >= SILENCE_MS)
        } else {
          silentSince = null
          setSilent(false)
        }

        const canvas = canvasRef.current
        const gfx = canvas?.getContext("2d")
        if (canvas && gfx) {
          const { width, height } = canvas
          gfx.clearRect(0, 0, width, height)
          const gap = 2
          const barWidth = (width - gap * (BARS - 1)) / BARS
          for (let i = 0; i < BARS; i++) {
            const start = Math.floor((i / BARS) * bins.length)
            const end = Math.floor(((i + 1) / BARS) * bins.length)
            let slice = 0
            for (let n = start; n < end; n++) slice += bins[n]
            const value = slice / Math.max(1, end - start) / 255
            const barHeight = Math.max(2, value * height)
            gfx.fillStyle = silentSince != null && time - silentSince >= SILENCE_MS
              ? "#d01f1f"
              : value > 0.78
                ? "#f7821c"
                : "#52c628"
            gfx.fillRect(i * (barWidth + gap), height - barHeight, barWidth, barHeight)
          }
        }
        frame = requestAnimationFrame(draw)
      }
      frame = requestAnimationFrame(draw)
    }

    void start().catch(() => {
      if (!cancelled) setFailed(true)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      void audioContext?.close()
      void window.livePane?.setSpeakerMuted(false)
    }
  }, [active, muteSpeakers])

  if (!active) return null

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[25] flex items-end gap-2 rounded-sm bg-inset/90 px-2 py-1.5">
      <canvas ref={canvasRef} width={72} height={22} className="block h-[22px] w-[72px]" />
      {failed ? (
        <span className="text-[11px] text-mute">Meter off</span>
      ) : silent ? (
        <span className="text-[11px] text-live">No audio</span>
      ) : (
        <span className="text-[11px] text-ink">Audio</span>
      )}
    </div>
  )
}
