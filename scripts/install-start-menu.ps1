# Add a Start Menu shortcut to the project-folder launcher.
#   powershell -ExecutionPolicy Bypass -File scripts\install-start-menu.ps1

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$programs = [Environment]::GetFolderPath("Programs")
$shortcutPath = Join-Path $programs "Live Pane.lnk"
$launcher = Join-Path $projectRoot "Live Pane.exe"

if (-not (Test-Path $launcher)) {
    throw "Missing $launcher. Run scripts\build-launcher.ps1 first."
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 1
$shortcut.Description = "YouTube livestream pane for the ProPresenter 2x2 grid"
$shortcut.IconLocation = "$launcher,0"
$shortcut.Save()

$dataDir = Join-Path $env:LOCALAPPDATA "Live Pane"
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
Set-Content -Path (Join-Path $dataDir "app-path.txt") -Value $launcher -Encoding UTF8

Write-Host "Start Menu shortcut created:"
Write-Host "  $shortcutPath"
Write-Host "It opens:"
Write-Host "  $launcher"
