# Install Live Pane so it starts when this Windows user signs in.
# Run from the project folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts/install-windows-startup.ps1

$ErrorActionPreference = "Stop"

$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Live Pane.lnk"
$projectRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $projectRoot "Live Pane.exe"
if (-not (Test-Path $launcher)) {
    throw "Missing $launcher. Run scripts\build-launcher.ps1 first."
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = "$launcher,0"

$shortcut.WindowStyle = 7
$shortcut.Description = "Church YouTube livestream pane for the ProPresenter 2x2 grid"
$shortcut.Save()

Write-Host "Live Pane will start at login."
Write-Host "Shortcut: $shortcutPath"
Write-Host "To stop it for one event: Task Manager -> Live Pane -> End task."
