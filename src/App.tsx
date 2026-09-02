import { useCallback, useEffect, useRef, useState } from "react"
import { AudioMeter } from "@/components/AudioMeter"
import { LivePlayer } from "@/components/LivePlayer"
import { SettingsPanel } from "@/components/SettingsPanel"
import { SetupScreen } from "@/components/SetupScreen"
import { TitleBar } from "@/components/TitleBar"
import { WaitingScreen } from "@/components/WaitingScreen"
import { isDesktopApp } from "@/lib/desktop"
import { fetchLiveStatus } from "@/lib/live"
import { loadSettings, saveSettings } from "@/lib/settings"
import type { LiveStatus, Settings } from "@/lib/types"

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [status, setStatus] = useState<LiveStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const hideTimer = useRef<number | null>(null)
  const requestId = useRef(0)
  const configured = Boolean(settings.channelInput.trim())

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const holdChrome = useCallback(() => {
    clearHideTimer()
    setChromeVisible(true)
  }, [clearHideTimer])

  const scheduleHideChrome = useCallback(() => {
    if (settingsOpen) {
      holdChrome()
      return
    }
    clearHideTimer()
    hideTimer.current = window.setTimeout(() => {
      setChromeVisible(false)
    }, 1600)
  }, [clearHideTimer, holdChrome, settingsOpen])

  const revealChrome = useCallback(() => {
    holdChrome()
    scheduleHideChrome()
  }, [holdChrome, scheduleHideChrome])

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const refresh = useCallback(async (channel: string) => {
    const id = ++requestId.current
    setChecking(true)
    try {
      const result = await fetchLiveStatus(channel)
      if (id !== requestId.current) return result
      setStatus(result)
      return result
    } catch (error) {
      const failed: LiveStatus = {
        ok: false,
        live: false,
        error: error instanceof Error ? error.message : "Live check failed",
      }
      if (id === requestId.current) setStatus(failed)
      return failed
    } finally {
      if (id === requestId.current) setChecking(false)
    }
  }, [])

  const connectChannel = useCallback(
    async (channel: string) => {
      setSetupError(null)
      const result = await refresh(channel)
      if (!result.ok && result.error) {
        setSetupError(result.error)
        return
      }
      patchSettings({ channelInput: channel })
    },
    [patchSettings, refresh],
  )

  useEffect(() => {
    if (!configured) return
    void refresh(settings.channelInput)
  }, [configured, refresh, settings.channelInput])

  useEffect(() => {
    if (!configured) return
    const intervalMs = (status?.live ? Math.max(settings.pollSeconds, 30) : settings.pollSeconds) * 1000
    const timer = window.setInterval(() => {
      void refresh(settings.channelInput)
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [configured, refresh, settings.channelInput, settings.pollSeconds, status?.live])

  useEffect(() => {
    if (settingsOpen) {
      holdChrome()
      return
    }
    scheduleHideChrome()
  }, [holdChrome, scheduleHideChrome, settingsOpen])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const live = Boolean(status?.ok && status.live && status.videoId)
  const channelLabel = status?.channelName || settings.channelInput

  if (!configured) {
    return (
      <SetupScreen
        initialValue={settings.channelInput}
        busy={checking}
        error={setupError}
        onSubmit={(channel) => void connectChannel(channel)}
      />
    )
  }

  return (
    <div className="relative h-full w-full bg-stage" onMouseMove={revealChrome}>
      {live && status?.videoId ? (
        <LivePlayer
          videoId={status.videoId}
          muted={settings.muted}
          showControls={settings.showControls}
          captureAudio={settings.showAudioMeter}
          onEnded={() => void refresh(settings.channelInput)}
          onError={() => void refresh(settings.channelInput)}
        />
      ) : (
        <WaitingScreen
          channelLabel={channelLabel}
          checking={checking}
          lastChecked={status?.checkedAt ?? null}
          warning={status?.warning ?? null}
          error={status?.error ?? null}
        />
      )}

      {live && settings.showAudioMeter && isDesktopApp() ? (
        <AudioMeter active muteSpeakers={settings.muted} />
      ) : null}

      {/* YouTube iframes swallow parent mousemove; keep a hit layer when controls are hidden. */}
      {live && !settings.showControls ? (
        <div
          className="absolute inset-0 z-20"
          onMouseMove={revealChrome}
          onPointerDown={revealChrome}
          aria-hidden
        />
      ) : null}

      <TitleBar
        visible={chromeVisible || settingsOpen}
        live={live}
        channelLabel={channelLabel}
        muted={settings.muted}
        onToggleMute={() => patchSettings({ muted: !settings.muted })}
        onOpenSettings={() => setSettingsOpen(true)}
        onPointerActive={holdChrome}
        onPointerIdle={scheduleHideChrome}
      />

      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        channelLabel={channelLabel}
        onClose={() => setSettingsOpen(false)}
        onChange={patchSettings}
        onChangeChannel={(channel) => void connectChannel(channel)}
      />
    </div>
  )
}
