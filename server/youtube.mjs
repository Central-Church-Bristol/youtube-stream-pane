const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

export function normalizeChannelInput(input) {
  const raw = String(input ?? "").trim()
  if (!raw) return { kind: "empty" }

  const stripped = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")

  const channelIdMatch = stripped.match(/(?:youtube\.com\/channel\/)?(UC[\w-]{21,24})\b/)
  if (channelIdMatch && (stripped.includes("channel/") || /^UC[\w-]{21,24}$/.test(stripped))) {
    return { kind: "id", channelId: channelIdMatch[1] }
  }
  if (/^UC[\w-]{21,24}$/.test(raw)) {
    return { kind: "id", channelId: raw }
  }

  const handleMatch = stripped.match(/@([\w.-]+)/)
  if (handleMatch) {
    return { kind: "handle", handle: `@${handleMatch[1]}` }
  }

  const custom = stripped.match(/youtube\.com\/c\/([^/?#]+)/i)
  if (custom) return { kind: "custom", name: custom[1] }

  const user = stripped.match(/youtube\.com\/user\/([^/?#]+)/i)
  if (user) return { kind: "user", name: user[1] }

  if (/^[\w.-]+$/.test(raw.replace(/^@/, ""))) {
    const name = raw.replace(/^@/, "")
    return { kind: "handle", handle: `@${name}` }
  }

  return { kind: "raw", value: raw }
}

export function buildLivePageUrl(input) {
  const n = normalizeChannelInput(input)
  if (n.kind === "id") return `https://www.youtube.com/channel/${n.channelId}/live`
  if (n.kind === "handle") return `https://www.youtube.com/${n.handle}/live`
  if (n.kind === "custom") return `https://www.youtube.com/c/${n.name}/live`
  if (n.kind === "user") return `https://www.youtube.com/user/${n.name}/live`
  if (n.kind === "raw") {
    if (/youtube\.com/i.test(n.value)) {
      const withScheme = n.value.startsWith("http") ? n.value : `https://${n.value}`
      return withScheme.replace(/\/+$/, "") + (withScheme.includes("/live") ? "" : "/live")
    }
    return `https://www.youtube.com/@${encodeURIComponent(n.value)}/live`
  }
  return "https://www.youtube.com/"
}

function extractAssignedObject(html, name) {
  const markers = [`var ${name} = `, `${name} = `, `window["${name}"] = `]
  let start = -1
  for (const marker of markers) {
    const idx = html.indexOf(marker)
    if (idx !== -1) {
      start = html.indexOf("{", idx)
      break
    }
  }
  if (start < 0) return null
  return parseBalancedObject(html, start)
}

function parseBalancedObject(html, start) {
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === "\\") esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function findByKey(obj, key, depth = 0) {
  if (!obj || depth > 14) return undefined
  if (Array.isArray(obj)) {
    for (const item of obj.slice(0, 40)) {
      const found = findByKey(item, key, depth + 1)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (typeof obj !== "object") return undefined
  if (Object.hasOwn(obj, key)) return obj[key]
  for (const value of Object.values(obj)) {
    const found = findByKey(value, key, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}

function ytText(value) {
  if (!value) return ""
  if (typeof value === "string") return value
  if (value.simpleText) return value.simpleText
  if (Array.isArray(value.runs)) return value.runs.map((run) => run.text ?? "").join("")
  if (value.content) return value.content
  return ""
}

function pickChannelId(html, data, player) {
  const fromPlayer = player?.videoDetails?.channelId
  if (fromPlayer) return fromPlayer
  const fromMeta = data?.metadata?.channelMetadataRenderer?.externalId
  if (fromMeta) return fromMeta
  const fromHeader = data?.header?.c4TabbedHeaderRenderer?.channelId
  if (fromHeader) return fromHeader
  const browse = findByKey(data, "browseId")
  if (typeof browse === "string" && browse.startsWith("UC")) return browse
  const match = html.match(/"channelId":"(UC[\w-]{21,24})"/)
  return match?.[1] ?? null
}

function pickChannelName(data, player) {
  const author = player?.videoDetails?.author
  if (author) return author
  const meta = data?.metadata?.channelMetadataRenderer?.title
  if (meta) return meta
  const owner = findByKey(data, "videoOwnerRenderer")
  const ownerName = ytText(owner?.title)
  if (ownerName) return ownerName
  const header = data?.header?.pageHeaderRenderer?.pageTitle
  if (header) return header
  const c4 = data?.header?.c4TabbedHeaderRenderer?.title
  return ytText(c4) || null
}

function pickWatchVideoId(data) {
  const endpoint = findByKey(data, "currentVideoEndpoint")
  const id = endpoint?.watchEndpoint?.videoId
  if (id) return id
  const watch = data?.contents?.twoColumnWatchNextResults
  return watch?.currentVideoEndpoint?.watchEndpoint?.videoId ?? null
}

function isWatchLive(data, html) {
  const watch = data?.contents?.twoColumnWatchNextResults
  const primary = watch?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer
  if (primary?.viewCount?.videoViewCountRenderer?.isLive === true) return true
  const badges = JSON.stringify(primary?.badges ?? "")
  if (badges.includes("LIVE")) return true
  return html.includes('"isLive":true') && html.includes(" watching now")
}

/**
 * @param {string} channelInput
 * @returns {Promise<object>}
 */
export async function checkYouTubeLive(channelInput) {
  const trimmed = String(channelInput ?? "").trim()
  if (!trimmed) {
    return {
      ok: false,
      live: false,
      error: "Paste a YouTube channel URL, @handle, or channel ID.",
    }
  }

  const pageUrl = buildLivePageUrl(trimmed)
  let res
  try {
    res = await fetch(pageUrl, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
        Cookie: "CONSENT=YES+; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LqqBg",
      },
      redirect: "follow",
    })
  } catch (error) {
    return {
      ok: false,
      live: false,
      error: `Could not reach YouTube (${error instanceof Error ? error.message : "network error"}). Check the AV computer's internet connection.`,
    }
  }

  const html = await res.text()
  if (res.status === 404 || html.includes("This channel does not exist")) {
    return {
      ok: false,
      live: false,
      error: "YouTube could not find that channel. Double-check the handle or URL.",
    }
  }

  const player = extractAssignedObject(html, "ytInitialPlayerResponse")
  const data = extractAssignedObject(html, "ytInitialData")
  const channelId = pickChannelId(html, data, player)
  const channelName = pickChannelName(data, player)
  const videoDetails = player?.videoDetails
  const playability = player?.playabilityStatus?.status

  if (videoDetails?.videoId && videoDetails.isLive === true && playability === "OK") {
    return {
      ok: true,
      live: true,
      videoId: videoDetails.videoId,
      title: videoDetails.title ?? null,
      channelId,
      channelName: videoDetails.author || channelName,
      viewers: videoDetails.viewCount ?? null,
      checkedAt: new Date().toISOString(),
    }
  }

  if (playability === "LIVE_STREAM_OFFLINE") {
    return {
      ok: true,
      live: false,
      channelId,
      channelName,
      reason: "offline",
      checkedAt: new Date().toISOString(),
    }
  }

  const watchVideoId = pickWatchVideoId(data)
  const watchTitle = ytText(
    data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]
      ?.videoPrimaryInfoRenderer?.title,
  )

  if (watchVideoId && isWatchLive(data, html)) {
    return {
      ok: true,
      live: true,
      videoId: watchVideoId,
      title: watchTitle || videoDetails?.title || null,
      channelId,
      channelName,
      checkedAt: new Date().toISOString(),
    }
  }

  const looksLikeChannelPage = Boolean(
    data?.metadata?.channelMetadataRenderer ||
      data?.header?.c4TabbedHeaderRenderer ||
      data?.header?.pageHeaderRenderer,
  )
  if (looksLikeChannelPage) {
    return {
      ok: true,
      live: false,
      channelId,
      channelName,
      reason: "offline",
      checkedAt: new Date().toISOString(),
    }
  }

  if (playability === "LOGIN_REQUIRED" || html.includes("Sign in to confirm")) {
    return {
      ok: true,
      live: false,
      channelId,
      channelName,
      reason: "unknown",
      warning:
        "YouTube challenged this computer as a bot while checking status. The pane will keep retrying, and the player itself usually still works on a normal church PC.",
      checkedAt: new Date().toISOString(),
    }
  }

  return {
    ok: true,
    live: false,
    channelId,
    channelName,
    reason: "offline",
    checkedAt: new Date().toISOString(),
  }
}
