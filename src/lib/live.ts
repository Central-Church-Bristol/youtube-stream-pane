import type { LiveStatus } from "@/lib/types"

export async function fetchLiveStatus(channel: string): Promise<LiveStatus> {
  if (window.livePane?.checkLive) {
    return window.livePane.checkLive(channel)
  }
  const res = await fetch(`/api/live?channel=${encodeURIComponent(channel)}`)
  if (!res.ok) {
    return { ok: false, live: false, error: `Live check failed (${res.status})` }
  }
  return (await res.json()) as LiveStatus
}

export function formatCheckedAt(iso?: string | null) {
  if (!iso) return "Not checked yet"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Not checked yet"
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
}
