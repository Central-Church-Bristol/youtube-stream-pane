@echo off
setlocal
cd /d "%~dp0\.."
if exist "release\LivePane-*-portable.exe" (
  for %%F in ("release\LivePane-*-portable.exe") do (
    start "" "%%F"
    goto :eof
  )
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Live Pane needs either the portable .exe in release\ or Node.js + npm.
  pause
  exit /b 1
)
start "" /min cmd /c "npm.cmd run desktop"
