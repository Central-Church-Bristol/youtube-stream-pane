export function normalizeChannelInput(input: string): {
  kind: string
  channelId?: string
  handle?: string
  name?: string
  value?: string
}

export function buildLivePageUrl(input: string): string

export function checkYouTubeLive(channelInput: string): Promise<{
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
}>
