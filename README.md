# Live Pane

A pin-able window for the church AV computer. It watches your YouTube channel and, the moment you go live, fills itself with that livestream.

It is built for the leftover cell in a 2×2 grid that already shows three ProPresenter outputs. Live Pane sits on top of that gap, can live in the Start Menu like a normal app, and can open only while ProPresenter is running.

ProPresenter cannot reliably host a YouTube live player as one of its own outputs (Web View / Web Action hits YouTube embed limits). This window is the practical substitute: always-on-top, borderless, snapped to a quadrant.

## What you get

- **Off air** while the channel is idle — a calm waiting screen, not a YouTube error.
- **Auto-switch** to the current livestream when YouTube says you are live.
- **Always on top** so it stays in the empty square over ProPresenter.
- **Snap to grid** — top-left, top-right, bottom-left, bottom-right of any monitor.
- **Start Menu app** via the Windows installer (`npm run dist:win`).
- **Start when ProPresenter runs** — waits in the background, opens with ProPresenter, quits when ProPresenter quits.
- **Muted by default** so the confidence screen does not fight house audio.

## Run it on the AV PC (Windows)

You do **not** need WSL. Origin’s CLI is macOS/Linux/WSL only; on a normal Windows box, get the project through the browser or Cursor Desktop, then run it with Node.

### Get the project (no WSL)

**Easiest if you already use Cursor on that PC**

1. Open [the codebase page](https://cursor.com/codebase/jonahling/youtube-stream-pane) (private — change visibility in settings there if you want).
2. Open the repo in Cursor Desktop, or download a ZIP from that page if the UI offers one.
3. Open a terminal in the project folder (PowerShell is fine).

**Or with Git for Windows**

1. Install [Git for Windows](https://git-scm.com/download/win).
2. In PowerShell:

```bat
git clone https://origin.cursor.com/git/jonahling/youtube-stream-pane.git
cd youtube-stream-pane
```

Sign in when Git asks (same Cursor account that owns the private repo).

### Option A — run from the folder (good for first test)

1. Install [Node.js](https://nodejs.org/) LTS if it is not already on the machine.
2. In the project folder:

```bat
npm install
npm run desktop
```

3. Paste your church YouTube URL, `@handle`, or channel ID (or use **Test with NASA** first).
4. Drag the window onto the multiview monitor. Open settings (move the mouse, click the gear) and snap it to the empty quadrant. Resize the edges if your gap is not a perfect half.
5. Leave **Always on top** on.

`scripts\Launch-LivePane.bat` starts the same window by hand. If PowerShell blocks `npm`, use `npm.cmd` instead.

### Option B — install as a normal Start Menu app

```bat
npm.cmd install
npm.cmd run dist:win
```

Then run the installer in `release\` (`LivePane-*-windows.exe`). That adds **Live Pane** to the Start Menu (and a desktop shortcut).

Or, from the project folder without the installer:

```bat
powershell -ExecutionPolicy Bypass -File scripts\install-start-menu.ps1
```

### Start only when ProPresenter is running

**Packaged app:** open Live Pane → settings → turn on **Start when ProPresenter runs**.  
A helper registers at login, stays quiet until ProPresenter opens, then shows Live Pane. When ProPresenter quits, Live Pane quits too.

**From the project folder** (also fine before you install the `.exe`):

```bat
powershell -ExecutionPolicy Bypass -File scripts\install-propresenter-watcher.ps1
```

That removes any old “start Live Pane at every login” shortcut and installs the ProPresenter watcher instead.  
To remove it later: `scripts\uninstall-propresenter-watcher.ps1`.

## Kill it for a one-off event

1. Ctrl+Shift+Esc
2. Find **Live Pane**
3. End task

If ProPresenter-linked launch is on, quitting ProPresenter also closes Live Pane.

## Browser-only preview

```bat
npm install
npm run dev
```

Open http://127.0.0.1:43147 — same viewer, without always-on-top or quadrant snap. Useful while designing. After `npm run build`, `npm start` serves the production build on the same port.

## Channel setup

Anything YouTube understands works:

- `https://www.youtube.com/@yourchurch`
- `@yourchurch`
- Channel ID (`UC…`) from YouTube Studio → Settings → Channel → Advanced

The stream must allow embedding (YouTube Studio → the livestream → Edit). Private broadcasts will not appear. Unlisted usually will, which is enough for a booth monitor.

There is a **Test with NASA** button on first launch so you can confirm the pane plays a known live stream before Sunday.

## Typical Sunday

1. The AV PC signs in. Live Pane opens in last week’s position, off air.
2. You start the YouTube livestream as usual.
3. Within about 15 seconds the pane switches to the program feed.
4. When you end the stream it returns to off air by itself.

## Developing

```bat
npm run dev          # web UI
npm run desktop      # UI + always-on-top Electron window
npm run lint
npm run build
```

Live status is checked locally against the public YouTube channel page. No API key is required.
