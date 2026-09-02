export type Quadrant = "top-left" | "top-right" | "bottom-left" | "bottom-right"

export interface LiveStatus {
  ok: boolean
  live: boolean
  videoId?: string | null
  title?: string | null
  channelId?: string | null
  channelName?: string | null
  viewers?: string | null
  reason?: string
  warning?: string
  error?: string
  checkedAt?: string
}

export interface Settings {
  channelInput: string
  muted: boolean
  pollSeconds: number
  showControls: boolean
  showAudioMeter: boolean
}

export interface DisplayInfo {
  id: number
  label: string
  bounds: { x: number; y: number; width: number; height: number }
  primary: boolean
}

export interface WindowState {
  isDesktop: boolean
  alwaysOnTop: boolean
  openAtLogin: boolean
  launchWithProPresenter: boolean
  watcherInstalled?: boolean
  watcherLogPath?: string
  watcherError?: string | null
  bounds: { x: number; y: number; width: number; height: number } | null
  displays: DisplayInfo[]
  packaged: boolean
}

export interface LivePaneDesktop {
  isDesktop: true
  getWindowState: () => Promise<WindowState>
  setAlwaysOnTop: (enabled: boolean) => Promise<{ ok: boolean }>
  setOpenAtLogin: (enabled: boolean) => Promise<{ ok: boolean; packaged: boolean }>
  setLaunchWithProPresenter: (enabled: boolean) => Promise<{
    ok: boolean
    packaged: boolean
    watcherInstalled?: boolean
    error?: string
  }>
  getMediaSourceId: () => Promise<string>
  setSpeakerMuted: (muted: boolean) => Promise<{ ok: boolean }>
  snapQuadrant: (
    quadrant: Quadrant,
    displayId?: number,
  ) => Promise<{ x: number; y: number; width: number; height: number }>
  setBounds: (bounds: {
    x: number
    y: number
    width: number
    height: number
  }) => Promise<{ x: number; y: number; width: number; height: number }>
  checkLive: (channel: string) => Promise<LiveStatus>
  quit: () => Promise<void>
  openExternal: (url: string) => Promise<void>
}

export type YtPlayer = {
  mute: () => void
  unMute: () => void
  playVideo: () => void
  destroy: () => void
  loadVideoById: (id: string) => void
}

export type YtNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      width?: string | number
      height?: string | number
      videoId: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YtPlayer }) => void
        onStateChange?: (event: { data: number }) => void
        onError?: () => void
      }
    },
  ) => YtPlayer
  PlayerState: { ENDED: number }
}

declare global {
  interface Window {
    livePane?: LivePaneDesktop
    YT?: YtNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}
