const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("livePane", {
  isDesktop: true,
  getWindowState: () => ipcRenderer.invoke("live-pane:window-state"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("live-pane:set-always-on-top", enabled),
  setOpenAtLogin: (enabled) => ipcRenderer.invoke("live-pane:set-open-at-login", enabled),
  setLaunchWithProPresenter: (enabled) =>
    ipcRenderer.invoke("live-pane:set-launch-with-propresenter", enabled),
  getMediaSourceId: () => ipcRenderer.invoke("live-pane:media-source-id"),
  setSpeakerMuted: (muted) => ipcRenderer.invoke("live-pane:set-speaker-muted", muted),
  snapQuadrant: (quadrant, displayId) =>
    ipcRenderer.invoke("live-pane:snap-quadrant", quadrant, displayId),
  setBounds: (bounds) => ipcRenderer.invoke("live-pane:set-bounds", bounds),
  checkLive: (channel) => ipcRenderer.invoke("live-pane:check-live", channel),
  quit: () => ipcRenderer.invoke("live-pane:quit"),
  openExternal: (url) => ipcRenderer.invoke("live-pane:open-external", url),
})
