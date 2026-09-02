# Install Live Pane so it starts when this Windows user signs in.
# Run from the project folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts/install-windows-startup.ps1

$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Live Pane.lnk"
$projectRoot = Split-Path -Parent $PSScriptRoot
$portable = Get-ChildItem -Path (Join-Path $projectRoot "release") -Filter "LivePane-*-portable.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
$installed = Join-Path $env:LOCALAPPDATA "Programs\live-pane\Live Pane.exe"
if (-not (Test-Path $installed)) {
    $installed = Join-Path $env:LOCALAPPDATA "Programs\Live Pane\Live Pane.exe"
}
$launcher = Join-Path $projectRoot "scripts\Launch-LivePane.bat"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)

if (Test-Path $installed) {
    $shortcut.TargetPath = $installed
    $shortcut.WorkingDirectory = Split-Path $installed
} elseif ($portable) {
    $shortcut.TargetPath = $portable.FullName
    $shortcut.WorkingDirectory = $portable.DirectoryName
} else {
    $shortcut.TargetPath = $launcher
    $shortcut.WorkingDirectory = $projectRoot
}

$shortcut.WindowStyle = 7
$shortcut.Description = "Church YouTube livestream pane for the ProPresenter 2x2 grid"
$shortcut.Save()

Write-Host "Live Pane will start at login."
Write-Host "Shortcut: $shortcutPath"
Write-Host "To stop it for one event: Task Manager -> Live Pane -> End task."
