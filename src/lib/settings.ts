import type { Settings } from "@/lib/types"

const STORAGE_KEY = "live-pane-settings"

export const defaultSettings: Settings = {
  channelInput: "",
  muted: true,
  pollSeconds: 15,
  showControls: false,
  showAudioMeter: true,
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...defaultSettings, ...parsed }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
