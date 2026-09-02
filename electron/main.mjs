import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { checkYouTubeLive } from "../server/youtube.mjs"
import { createLivePaneServer, listenOnPort } from "../server/http.mjs"

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PREFERRED_PORT = 43147
const isDev = process.env.LIVE_PANE_DEV === "1"
const WATCH_FLAG = "--watch-propresenter"
const WATCHER_SHORTCUT_NAME = "Live Pane ProPresenter Watcher.lnk"

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {Tray | null} */
let tray = null
let localServer = null
/** @type {ReturnType<typeof setInterval> | null} */
let watchTimer = null
/** @type {ReturnType<typeof setInterval> | null} */
let pinTimer = null
let watchMode = process.argv.includes(WATCH_FLAG)
let propresenterSeen = false
/** @type {string | null} */
let lastWatcherError = null

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    // User opened Live Pane from Start Menu while a watcher instance is waiting.
    watchMode = false
    stopWatchTimer()
    void ensureWindowVisible()
  })
}

function configPath() {
  return path.join(app.getPath("userData"), "window.json")
}

function readWindowConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"))
  } catch {
    return {}
  }
}

function writeWindowConfig(patch) {
  const next = { ...readWindowConfig(), ...patch }
  fs.mkdirSync(app.getPath("userData"), { recursive: true })
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2))
  return next
}

function defaultBoundsForDisplay(display) {
  const { x, y, width, height } = display.bounds
  return {
    x: x + Math.floor(width / 2),
    y: y + Math.floor(height / 2),
    width: Math.max(480, Math.floor(width / 2)),
    height: Math.max(270, Math.floor(height / 2)),
  }
}

function clampBounds(bounds, display) {
  const area = display?.bounds ?? screen.getPrimaryDisplay().bounds
  const width = Math.min(Math.max(bounds.width ?? 960, 320), area.width)
  const height = Math.min(Math.max(bounds.height ?? 540, 180), area.height)
  const x = Math.min(Math.max(bounds.x ?? area.x, area.x), area.x + area.width - width)
  const y = Math.min(Math.max(bounds.y ?? area.y, area.y), area.y + area.height - height)
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

function displayFromId(id) {
  return screen.getAllDisplays().find((display) => display.id === id) ?? screen.getPrimaryDisplay()
}

function snapBounds(quadrant, display) {
  const { x, y, width, height } = display.bounds
  const halfW = Math.floor(width / 2)
  const halfH = Math.floor(height / 2)
  switch (quadrant) {
    case "top-left":
      return { x, y, width: halfW, height: halfH }
    case "top-right":
      return { x: x + halfW, y, width: width - halfW, height: halfH }
    case "bottom-left":
      return { x, y: y + halfH, width: halfW, height: height - halfH }
    default:
      return { x: x + halfW, y: y + halfH, width: width - halfW, height: height - halfH }
  }
}

function applyAlwaysOnTop(win, enabled) {
  if (enabled) {
    // Highest Electron level. Do not focus the pane here — ProPresenter must
    // keep keyboard focus. Re-applying HWND_TOPMOST is enough to stay above.
    win.setAlwaysOnTop(true, "screen-saver", 1)
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  } else {
    stopPinTimer()
    win.setAlwaysOnTop(false)
    win.setVisibleOnAllWorkspaces(false)
  }
}

function pinOverlayIfNeeded() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (readWindowConfig().alwaysOnTop === false) return
  applyAlwaysOnTop(mainWindow, true)
}

function startPinTimer() {
  stopPinTimer()
  pinOverlayIfNeeded()
  pinTimer = setInterval(pinOverlayIfNeeded, 800)
}

function stopPinTimer() {
  if (pinTimer) {
    clearInterval(pinTimer)
    pinTimer = null
  }
}

function iconPngPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, "icon.png")
  return path.join(__dirname, "..", "build", "icon.png")
}

function createTray() {
  if (tray) return
  const png = iconPngPath()
  let image = fs.existsSync(png) ? nativeImage.createFromPath(png) : nativeImage.createEmpty()
  if (!image.isEmpty()) {
    image = image.resize({ width: 16, height: 16, quality: "best" })
  }
  tray = new Tray(image)
  tray.setToolTip("Live Pane")
  const menu = Menu.buildFromTemplate([
    { label: "Live Pane", enabled: false },
    { type: "separator" },
    {
      label: "Show overlay",
      click: () => {
        void ensureWindowVisible()
        pinOverlayIfNeeded()
      },
    },
    { type: "separator" },
    { label: "Quit Live Pane", click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on("click", () => tray?.popUpContextMenu(menu))
}

function serializeDisplays() {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    label: display.label || `Display ${index + 1}`,
    bounds: display.bounds,
    primary: display.id === primaryId,
  }))
}

function powershellExe() {
  return path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
}

function scriptsDir() {
  if (app.isPackaged) return path.join(process.resourcesPath, "scripts")
  return path.join(__dirname, "..", "scripts")
}

function watcherDataDir() {
  return path.join(process.env.LOCALAPPDATA || app.getPath("home"), "Live Pane")
}

function watcherShortcutPath() {
  return path.join(
    process.env.APPDATA || "",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    WATCHER_SHORTCUT_NAME,
  )
}

function watcherIsInstalled() {
  return process.platform === "win32" && fs.existsSync(watcherShortcutPath())
}

function resolveInstalledExeFromDisk() {
  const local = process.env.LOCALAPPDATA || ""
  const candidates = [
    path.join(local, "Programs", "live-pane", "Live Pane.exe"),
    path.join(local, "Programs", "Live Pane", "Live Pane.exe"),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

async function isProPresenterRunning() {
  if (process.platform !== "win32") return false
  try {
    const { stdout } = await execFileAsync("tasklist", [
      "/FI",
      "IMAGENAME eq ProPresenter.exe",
      "/FO",
      "CSV",
      "/NH",
    ])
    return stdout.toLowerCase().includes("propresenter.exe")
  } catch {
    return false
  }
}

function stopWatchTimer() {
  if (watchTimer) {
    clearInterval(watchTimer)
    watchTimer = null
  }
}

function clearLoginItems() {
  try {
    app.setLoginItemSettings({
      openAtLogin: false,
      openAsHidden: false,
      name: "Live Pane",
      args: [],
      enabled: false,
    })
  } catch {
    // Windows login-item APIs can throw; the watcher scripts also delete the Run key.
  }
}

async function runWatcherScript(scriptName, extraArgs = []) {
  const script = path.join(scriptsDir(), scriptName)
  if (!fs.existsSync(script)) {
    throw new Error(`Missing ${scriptName}. Rebuild the Windows app (npm.cmd run dist:win) so scripts ship with it.`)
  }
  const { stdout, stderr } = await execFileAsync(
    powershellExe(),
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...extraArgs],
    { windowsHide: true, timeout: 45000 },
  )
  return `${stdout || ""}${stderr || ""}`.trim()
}

async function applyLaunchWithProPresenter(enabled) {
  writeWindowConfig({
    launchWithProPresenter: Boolean(enabled),
    openAtLogin: false,
  })
  clearLoginItems()

  if (process.platform !== "win32") {
    return { ok: true, packaged: app.isPackaged, watcherInstalled: false }
  }

  try {
    if (enabled) {
      const extra = []
      const exe = app.isPackaged ? process.execPath : resolveInstalledExeFromDisk()
      if (exe) extra.push("-AppExe", exe)
      await runWatcherScript("install-propresenter-watcher.ps1", extra)
    } else {
      await runWatcherScript("uninstall-propresenter-watcher.ps1")
    }
    lastWatcherError = null
    return {
      ok: true,
      packaged: app.isPackaged,
      watcherInstalled: enabled && watcherIsInstalled(),
    }
  } catch (error) {
    lastWatcherError = error instanceof Error ? error.message : String(error)
    return {
      ok: false,
      packaged: app.isPackaged,
      watcherInstalled: watcherIsInstalled(),
      error: lastWatcherError,
    }
  }
}

async function resolveAppUrl() {
  if (isDev) {
    return `http://127.0.0.1:${process.env.LIVE_PANE_PORT || PREFERRED_PORT}`
  }
  const server = createLivePaneServer()
  const port = await listenOnPort(server, PREFERRED_PORT)
  localServer = server
  return `http://127.0.0.1:${port}`
}

async function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow

  const saved = readWindowConfig()
  const display = saved.displayId ? displayFromId(saved.displayId) : screen.getPrimaryDisplay()
  const bounds = saved.bounds
    ? clampBounds(saved.bounds, screen.getDisplayMatching(saved.bounds))
    : defaultBoundsForDisplay(display)
  const alwaysOnTop = saved.alwaysOnTop !== false

  mainWindow = new BrowserWindow({
    title: "Live Pane",
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 320,
    minHeight: 180,
    backgroundColor: "#070708",
    frame: false,
    autoHideMenuBar: true,
    show: false,
    alwaysOnTop,
    skipTaskbar: true,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  applyAlwaysOnTop(mainWindow, alwaysOnTop)
  if (alwaysOnTop) startPinTimer()

  const persistBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    const next = mainWindow.getBounds()
    const onDisplay = screen.getDisplayMatching(next)
    writeWindowConfig({ bounds: next, displayId: onDisplay.id })
  }

  mainWindow.on("moved", persistBounds)
  mainWindow.on("resized", persistBounds)
  mainWindow.on("blur", () => pinOverlayIfNeeded())

  const url = await resolveAppUrl()
  await mainWindow.loadURL(url)
  mainWindow.once("ready-to-show", () => {
    mainWindow?.showInactive()
    pinOverlayIfNeeded()
  })
  mainWindow.on("closed", () => {
    mainWindow = null
  })
  return mainWindow
}

async function ensureWindowVisible() {
  await createWindow()
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function startWatchLoop() {
  stopWatchTimer()
  watchTimer = setInterval(() => {
    void (async () => {
      const running = await isProPresenterRunning()
      if (running) {
        propresenterSeen = true
        if (!mainWindow || mainWindow.isDestroyed()) {
          await createWindow()
        } else if (!mainWindow.isVisible()) {
          mainWindow.show()
        }
        return
      }
      if (propresenterSeen && watchMode) {
        // ProPresenter closed — clear the pane until next launch.
        app.quit()
      }
    })()
  }, 2500)
}

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required")
app.setName("Live Pane")
app.setAppUserModelId("church.livepane")

app.whenReady().then(async () => {
  const saved = readWindowConfig()
  if (saved.alwaysOnTop === undefined || saved.launchWithProPresenter === undefined) {
    writeWindowConfig({
      alwaysOnTop: saved.alwaysOnTop !== false,
      launchWithProPresenter: Boolean(saved.launchWithProPresenter),
      openAtLogin: false,
    })
  }

  createTray()

  // Prefer the Startup PowerShell watcher. Never register Live Pane as a login item.
  clearLoginItems()
  if (Boolean(readWindowConfig().launchWithProPresenter)) {
    await applyLaunchWithProPresenter(true)
  }

  if (watchMode) {
    startWatchLoop()
    if (await isProPresenterRunning()) {
      propresenterSeen = true
      await createWindow()
    }
    return
  }

  await createWindow()
})

app.on("window-all-closed", () => {
  stopWatchTimer()
  stopPinTimer()
  if (localServer) {
    localServer.close()
    localServer = null
  }
  if (process.platform !== "darwin") app.quit()
})

app.on("before-quit", () => {
  stopPinTimer()
  if (tray) {
    tray.destroy()
    tray = null
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow()
})

ipcMain.handle("live-pane:window-state", () => {
  const saved = readWindowConfig()
  return {
    isDesktop: true,
    alwaysOnTop: saved.alwaysOnTop !== false,
    openAtLogin: false,
    launchWithProPresenter: Boolean(saved.launchWithProPresenter),
    watcherInstalled: watcherIsInstalled(),
    watcherLogPath: path.join(watcherDataDir(), "watcher.log"),
    watcherError: lastWatcherError,
    bounds: mainWindow?.getBounds() ?? saved.bounds ?? null,
    displays: serializeDisplays(),
    packaged: app.isPackaged,
  }
})

ipcMain.handle("live-pane:set-always-on-top", (_event, enabled) => {
  writeWindowConfig({ alwaysOnTop: Boolean(enabled) })
  if (mainWindow) applyAlwaysOnTop(mainWindow, Boolean(enabled))
  if (enabled) startPinTimer()
  else stopPinTimer()
  return { ok: true }
})

ipcMain.handle("live-pane:set-open-at-login", async (_event, _enabled) => {
  // Kept for compatibility; prefer launch-with-ProPresenter.
  return applyLaunchWithProPresenter(false)
})

ipcMain.handle("live-pane:set-launch-with-propresenter", async (_event, enabled) => {
  return applyLaunchWithProPresenter(Boolean(enabled))
})

ipcMain.handle("live-pane:snap-quadrant", (_event, quadrant, displayId) => {
  const display = displayId
    ? displayFromId(displayId)
    : screen.getDisplayMatching(mainWindow?.getBounds() ?? { x: 0, y: 0, width: 1, height: 1 })
  const bounds = snapBounds(quadrant, display)
  mainWindow?.setBounds(bounds)
  writeWindowConfig({ bounds, displayId: display.id, quadrant })
  return bounds
})

ipcMain.handle("live-pane:set-bounds", (_event, bounds) => {
  const display = screen.getDisplayMatching(bounds)
  const next = clampBounds(bounds, display)
  mainWindow?.setBounds(next)
  writeWindowConfig({ bounds: next, displayId: display.id })
  return next
})

ipcMain.handle("live-pane:check-live", (_event, channel) => checkYouTubeLive(channel))

ipcMain.handle("live-pane:media-source-id", (event) => event.sender.getMediaSourceId(event.sender))

ipcMain.handle("live-pane:set-speaker-muted", (_event, muted) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.setAudioMuted(Boolean(muted))
  }
  return { ok: true }
})

ipcMain.handle("live-pane:quit", () => {
  app.quit()
})

ipcMain.handle("live-pane:open-external", (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//.test(url)) {
    shell.openExternal(url)
  }
})
