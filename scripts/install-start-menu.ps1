# Add Live Pane to the Windows Start Menu like a normal app.
# Run from the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\install-start-menu.ps1

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$programs = [Environment]::GetFolderPath("Programs")
$shortcutPath = Join-Path $programs "Live Pane.lnk"
$portable = Get-ChildItem -Path (Join-Path $projectRoot "release") -Filter "LivePane-*-portable.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
$nsisExe = Get-ChildItem -Path (Join-Path $projectRoot "release") -Filter "LivePane-*-windows.exe" -ErrorAction SilentlyContinue |
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
} elseif ($nsisExe) {
    Write-Host "Found the installer at $($nsisExe.FullName)"
    Write-Host "Run that installer once for a proper Start Menu app, or build the portable first."
    $shortcut.TargetPath = $nsisExe.FullName
    $shortcut.WorkingDirectory = $nsisExe.DirectoryName
} else {
    $shortcut.TargetPath = $env:ComSpec
    $shortcut.Arguments = "/c `"$launcher`""
    $shortcut.WorkingDirectory = $projectRoot
}

$shortcut.WindowStyle = 1
$shortcut.Description = "YouTube livestream pane for the ProPresenter 2x2 grid"
$shortcut.Save()

Write-Host "Start Menu shortcut created:"
Write-Host "  $shortcutPath"
Write-Host "Search for 'Live Pane' in the Start Menu to open it."
