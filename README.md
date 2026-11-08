# Live Pane

A pin-able window for the Central Church Bristol AV computer. It watches your YouTube channel and, the moment you go live, fills itself with that livestream.

It is built for the leftover cell in a 2×2 grid that already shows three ProPresenter outputs. Live Pane sits on top of that gap, can live in the Start Menu like a normal app, and can open only while ProPresenter is running.

ProPresenter cannot reliably host a YouTube live player as one of its own outputs (Web View / Web Action hits YouTube embed limits). This window is the practical substitute: always-on-top, borderless, snapped to a quadrant.

## What you get

- **Off air** while the channel is idle — a calm waiting screen, not a YouTube error.
- **Auto-switch** to the current livestream when YouTube says you are live.
- **Always on top** so it stays in the empty square over ProPresenter.
- **Snap to grid** — top-left, top-right, bottom-left, bottom-right of any monitor.
- **A normal Windows app** — installed from `release\`, listed as **Live Pane** in the Start Menu and Task Manager.
- **Start when ProPresenter runs** — waits in the background, opens with ProPresenter, quits when ProPresenter quits.
- **Muted by default** so the confidence screen does not fight house audio.

## Run it on the AV PC (Windows)

### Get the project

1. Install [Git for Windows](https://git-scm.com/download/win) if it is not already on the machine.
2. In PowerShell:

```bat
git clone https://github.com/Central-Church-Bristol/youtube-stream-pane.git
cd youtube-stream-pane
```

Or download a ZIP from [the GitHub repo](https://github.com/Central-Church-Bristol/youtube-stream-pane) and unzip it somewhere easy to find.

### Option A — run from the folder (good for first test)

1. Install [Node.js](https://nodejs.org/) LTS if it is not already on the machine.
2. In the project folder:

```bat
npm install
npm.cmd run desktop
```

3. Paste your church YouTube URL, `@handle`, or channel ID (or use **Test with NASA** first).
4. Drag the window onto the multiview monitor. Open settings (move the mouse, click the gear) and snap it to the empty quadrant. Resize the edges if your gap is not a perfect half.
5. Leave **Always on top** on.

`scripts\Launch-LivePane.bat` starts it by hand (once Live Pane is installed, it opens the installed app instead). If PowerShell blocks `npm`, use `npm.cmd` instead.

### Option B — install it as an app (what the AV PC uses)

Windows then lists it as **Live Pane**, with its own icon, in the Start Menu, Task Manager and the taskbar. In the project folder:

```bat
npm.cmd install
npm.cmd run dist:win
```

That builds `release\LivePane-<version>-windows.exe`. Quit Live Pane (tray icon → **Quit Live Pane**), then install it:

```bat
powershell -ExecutionPolicy Bypass -File scripts\install-app.ps1
```

The script runs the newest installer, removes leftovers from older setups, and points the ProPresenter watcher at the installed app. Live Pane opens when it finishes, with its saved channel and position.

The installed app doesn't change when the code in this folder changes. After a change, build and install again.

`Live Pane.exe` in this folder (from `scripts\build-launcher.ps1`) opens the installed app. Before Live Pane is installed, or when started with `--dev`, it runs the development version from source (`npm.cmd run desktop`), which Windows lists as "Electron".

### Start only when ProPresenter is running

Open Live Pane → settings → turn on **Start when ProPresenter runs**.  
A helper registers at login, stays quiet until ProPresenter opens, then shows Live Pane. When ProPresenter quits, Live Pane quits too.

From the project folder:

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
npm.cmd install
npm.cmd run dev
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
npm.cmd run dev       # web UI
npm.cmd run desktop   # UI + always-on-top window
npm.cmd run lint
npm.cmd run build
npm.cmd run dist:win  # installer in release\
```

Live status is checked locally against the public YouTube channel page. No API key is required.
