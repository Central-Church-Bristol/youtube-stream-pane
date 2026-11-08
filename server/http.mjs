import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { checkYouTubeLive } from "./youtube.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, "../dist")

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
}

export function createLivePaneServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1")

    if (url.pathname === "/api/live") {
      const channel = url.searchParams.get("channel") ?? ""
      try {
        const result = await checkYouTubeLive(channel)
        res.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        })
        res.end(JSON.stringify(result))
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" })
        res.end(
          JSON.stringify({
            ok: false,
            live: false,
            error: error instanceof Error ? error.message : "Live check failed",
          }),
        )
      }
      return
    }

    if (url.pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
      res.end(JSON.stringify({ ok: true, name: "Live Pane" }))
      return
    }

    const safePath = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, "")
    let filePath = path.join(distDir, safePath)
    if (safePath === "/" || !path.extname(filePath)) {
      filePath = path.join(distDir, "index.html")
    }
    if (!existsSync(filePath) || !filePath.startsWith(distDir)) {
      filePath = path.join(distDir, "index.html")
    }

    try {
      const body = await readFile(filePath)
      const type = MIME[path.extname(filePath)] ?? "application/octet-stream"
      res.writeHead(200, { "Content-Type": type })
      res.end(body)
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Not found")
    }
  })
}

export function listenOnPort(server, preferredPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, attemptsLeft) => {
      const onListening = () => {
        server.off("error", onError)
        resolve(port)
      }
      const onError = (error) => {
        // Drop this port's listener, or it would also fire (with the wrong
        // port) once a later port starts listening.
        server.off("listening", onListening)
        if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
          tryPort(port + 1, attemptsLeft - 1)
          return
        }
        reject(error)
      }
      server.once("error", onError)
      server.once("listening", onListening)
      server.listen(port, "127.0.0.1")
    }
    tryPort(preferredPort, 8)
  })
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  const preferred = Number(process.env.PORT || 43147)
  const server = createLivePaneServer()
  const port = await listenOnPort(server, preferred)
  console.log(`Live Pane running at http://127.0.0.1:${port}`)
}
