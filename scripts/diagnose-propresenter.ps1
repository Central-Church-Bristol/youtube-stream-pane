# Print why Live Pane may not be opening/closing with ProPresenter.
#   powershell -ExecutionPolicy Bypass -File scripts\diagnose-propresenter.ps1

$ErrorActionPreference = "Continue"

$dataDir = Join-Path $env:LOCALAPPDATA "Live Pane"
$logPath = Join-Path $dataDir "watcher.log"
$appPathFile = Join-Path $dataDir "app-path.txt"
$destScript = Join-Path $dataDir "Watch-ProPresenter.ps1"
$startup = [Environment]::GetFolderPath("Startup")
$watcherShortcut = Join-Path $startup "Live Pane ProPresenter Watcher.lnk"
$oldStartup = Join-Path $startup "Live Pane.lnk"
$startMenu = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Live Pane.lnk"
$windowJson = Join-Path $env:APPDATA "Live Pane\window.json"
$ppExe = "C:\Program Files\Renewed Vision\ProPresenter\ProPresenter.exe"

function Show-Heading([string]$Title) {
    Write-Host ""
    Write-Host "=== $Title ==="
}

Show-Heading "ProPresenter.exe"
Write-Host "On disk: $(Test-Path $ppExe)  $ppExe"
$main = Get-Process -Name "ProPresenter" -ErrorAction SilentlyContinue
$helpers = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -like "ProPresenter*" -and $_.ProcessName -ne "ProPresenter"
}
if ($main) {
    Write-Host "Main process RUNNING  pid $($main.Id -join ', ')  $($main.Path)"
} else {
    Write-Host "Main process NOT running (this is what Live Pane waits for)."
}
if ($helpers) {
    Write-Host "Helper processes (ignored by the watcher):"
    $helpers | ForEach-Object { Write-Host ("  {0}  pid {1}" -f $_.ProcessName, $_.Id) }
} else {
    Write-Host "No ProPresenter helper processes."
}

Show-Heading "Live Pane.exe"
$candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\live-pane\Live Pane.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Live Pane\Live Pane.exe")
)
foreach ($path in $candidates) {
    Write-Host "$(if (Test-Path $path) { 'FOUND ' } else { 'missing' })  $path"
}
if (Test-Path $appPathFile) {
    Write-Host "app-path.txt: $((Get-Content $appPathFile -Raw).Trim())"
} else {
    Write-Host "app-path.txt: (none)"
}
if (Test-Path $startMenu) {
    $shell = New-Object -ComObject WScript.Shell
    Write-Host "Start Menu target: $($shell.CreateShortcut($startMenu).TargetPath)"
} else {
    Write-Host "Start Menu shortcut: (none)"
}
$live = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -eq "Live Pane" -or $_.ProcessName -eq "LivePane"
}
if ($live) {
    Write-Host ("Live Pane RUNNING  pid {0}" -f ($live.Id -join ", "))
} else {
    Write-Host "Live Pane is not running."
}

Show-Heading "Startup watcher"
Write-Host "Shortcut: $(if (Test-Path $watcherShortcut) { 'YES' } else { 'NO ' })  $watcherShortcut"
if (Test-Path $watcherShortcut) {
    $shell = New-Object -ComObject WScript.Shell
    $sc = $shell.CreateShortcut($watcherShortcut)
    Write-Host "  Target: $($sc.TargetPath)"
    Write-Host "  Args:   $($sc.Arguments)"
}
Write-Host "Old login shortcut: $(if (Test-Path $oldStartup) { 'YES (should remove)' } else { 'no' })  $oldStartup"
Write-Host "Copied script: $(if (Test-Path $destScript) { 'YES' } else { 'NO' })  $destScript"

$runKey = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -ErrorAction SilentlyContinue
if ($runKey -and $runKey."Live Pane") {
    Write-Host "WARNING: Electron login item still registered (starts Live Pane at sign-in):"
    Write-Host "  $($runKey.'Live Pane')"
} else {
    Write-Host "Electron Run key: none (good - Live Pane should not start at every login)."
}

$watchers = Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*Watch-ProPresenter.ps1*" }
if ($watchers) {
    Write-Host ("Watcher process RUNNING  pid {0}" -f ($watchers.ProcessId -join ", "))
} else {
    Write-Host "Watcher process is not running this session. Sign out/in, or run install-propresenter-watcher.ps1, or toggle the setting."
}

Show-Heading "App setting"
if (Test-Path $windowJson) {
    Get-Content $windowJson
} else {
    Write-Host "(no window.json yet)"
}

Show-Heading "watcher.log (last 40 lines)"
Write-Host $logPath
if (Test-Path $logPath) {
    Get-Content $logPath -Tail 40
} else {
    Write-Host "(no log yet - watcher has not started)"
}

Write-Host ""
Write-Host "Expected: open ProPresenter -> log says detected -> Live Pane appears."
Write-Host "          quit ProPresenter -> log says closed -> Live Pane closes."
Write-Host "If ProPresenter runs on another PC, process watching cannot work on this one."
