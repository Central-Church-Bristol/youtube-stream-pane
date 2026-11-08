@echo off
setlocal
cd /d "%~dp0\.."
if exist "Live Pane.exe" (
  start "" "%~dp0\..\Live Pane.exe"
  goto :eof
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Live Pane needs Node.js. Install it from https://nodejs.org/
  pause
  exit /b 1
)
start "" /min cmd /c "npm.cmd run desktop"
