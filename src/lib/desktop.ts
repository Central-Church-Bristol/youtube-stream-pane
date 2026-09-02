import type { WindowState } from "@/lib/types"

export function isDesktopApp() {
  return Boolean(window.livePane?.isDesktop)
}

export async function loadWindowState(): Promise<WindowState | null> {
  if (!window.livePane) return null
  return window.livePane.getWindowState()
}
