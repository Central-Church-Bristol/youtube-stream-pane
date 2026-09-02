# Remove the ProPresenter watcher from Windows Startup and stop the background helper.
# Does not quit Live Pane if it is already open.

param(
    [switch]$KeepLog
)

$ErrorActionPreference = "Continue"

$dataDir = Join-Path $env:LOCALAPPDATA "Live Pane"
$logPath = Join-Path $dataDir "watcher.log"
$startup = [Environment]::GetFolderPath("Startup")
$watcherShortcut = Join-Path $startup "Live Pane ProPresenter Watcher.lnk"
$oldStartup = Join-Path $startup "Live Pane.lnk"

function Write-Log {
    param([string]$Message)
    if (Test-Path $dataDir) {
        $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
        Add-Content -Path $logPath -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
    }
    Write-Host $Message
}

Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*Watch-ProPresenter.ps1*" } |
    ForEach-Object {
        Write-Log ("Stopping watcher pid {0}." -f $_.ProcessId)
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

if (Test-Path $watcherShortcut) {
    Remove-Item $watcherShortcut -Force
    Write-Log "Removed ProPresenter watcher from Startup."
} else {
    Write-Log "No ProPresenter watcher shortcut was found."
}

if (Test-Path $oldStartup) {
    Remove-Item $oldStartup -Force
    Write-Log "Removed old Start-with-Windows Live Pane shortcut."
}

Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Live Pane" -ErrorAction SilentlyContinue

if (-not $KeepLog) {
    Write-Log "Watcher uninstalled. Live Pane will not auto-open with ProPresenter."
}
