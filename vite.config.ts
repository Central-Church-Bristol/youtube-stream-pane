import { defineConfig, type Plugin, type PreviewServer, type ViteDevServer } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

function attachLiveApi(server: ViteDevServer | PreviewServer) {
  server.middlewares.use(async (req, res, next) => {
    const raw = req.url ?? ""
    if (!raw.startsWith("/api/live")) {
      next()
      return
    }
    const url = new URL(raw, "http://127.0.0.1")
    const channel = url.searchParams.get("channel") ?? ""
    try {
      const { checkYouTubeLive } = await import("./server/youtube.mjs")
      const result = await checkYouTubeLive(channel)
      res.statusCode = 200
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.setHeader("Cache-Control", "no-store")
      res.end(JSON.stringify(result))
    } catch (error) {
      res.statusCode = 500
      res.setHeader("Content-Type", "application/json; charset=utf-8")
      res.end(
        JSON.stringify({
          ok: false,
          live: false,
          error: error instanceof Error ? error.message : "Live check failed",
        }),
      )
    }
  })
}

function youtubeLiveApi(): Plugin {
  return {
    name: "youtube-live-api",
    configureServer(server) {
      attachLiveApi(server)
    },
    configurePreviewServer(server) {
      attachLiveApi(server)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), youtubeLiveApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 43147,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 43147,
    strictPort: true,
  },
})
