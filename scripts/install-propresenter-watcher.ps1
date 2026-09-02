# Install a Startup helper that opens Live Pane only while ProPresenter.exe is running.
# Run from the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\install-propresenter-watcher.ps1
#
# The Settings toggle in the installed app calls this same script.
# Also removes any old "start Live Pane at every login" shortcut / Run key.

param(
    [string]$AppExe = "",
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

$dataDir = Join-Path $env:LOCALAPPDATA "Live Pane"
$logPath = Join-Path $dataDir "watcher.log"
$appPathFile = Join-Path $dataDir "app-path.txt"
$destScript = Join-Path $dataDir "Watch-ProPresenter.ps1"
$sourceScript = Join-Path $PSScriptRoot "Watch-ProPresenter.ps1"
$startup = [Environment]::GetFolderPath("Startup")
$watcherShortcut = Join-Path $startup "Live Pane ProPresenter Watcher.lnk"
$oldStartup = Join-Path $startup "Live Pane.lnk"

function Write-Log {
    param([string]$Message)
    if (-not (Test-Path $dataDir)) {
        New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
    }
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $logPath -Value $line -Encoding UTF8
    Write-Host $Message
}

function Resolve-InstalledExe {
    if ($AppExe -and (Test-Path $AppExe)) { return $AppExe }
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\live-pane\Live Pane.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Live Pane\Live Pane.exe")
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    $lnk = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Live Pane.lnk"
    if (Test-Path $lnk) {
        $shell = New-Object -ComObject WScript.Shell
        $target = $shell.CreateShortcut($lnk).TargetPath
        if ($target -and (Test-Path $target)) { return $target }
    }
    return $null
}

if (-not (Test-Path $sourceScript)) {
    throw "Watch-ProPresenter.ps1 was not found next to this installer: $sourceScript"
}

New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
Copy-Item -Path $sourceScript -Destination $destScript -Force

$exe = Resolve-InstalledExe
if ($exe) {
    Set-Content -Path $appPathFile -Value $exe -Encoding UTF8
    Write-Log "Recorded Live Pane.exe: $exe"
} else {
    Write-Log "WARNING: Live Pane.exe not found yet. Watcher will look again when ProPresenter opens."
}

if (Test-Path $oldStartup) {
    Remove-Item $oldStartup -Force
    Write-Log "Removed old Start-with-Windows Live Pane shortcut."
}

# Electron login items are unreliable on Windows and would start Live Pane at every sign-in.
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Live Pane" -ErrorAction SilentlyContinue

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($watcherShortcut)
$shortcut.TargetPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$destScript`""
$shortcut.WorkingDirectory = $dataDir
$shortcut.WindowStyle = 7
$shortcut.Description = "Opens Live Pane when ProPresenter.exe is running"
$shortcut.Save()

Write-Log "ProPresenter watcher installed."
Write-Log "Shortcut: $watcherShortcut"
Write-Log "Log: $logPath"

if (-not $NoStart) {
    $running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*Watch-ProPresenter.ps1*" }
    if ($running) {
        Write-Log ("Watcher already running (pid {0})." -f ($running.ProcessId -join ", "))
    } else {
        Start-Process -FilePath $shortcut.TargetPath -ArgumentList $shortcut.Arguments -WindowStyle Hidden
        Write-Log "Watcher started for this session (no reboot needed)."
    }
}

Write-Host "Live Pane itself does not start at login. When ProPresenter.exe opens, Live Pane appears; when ProPresenter quits, Live Pane closes."
