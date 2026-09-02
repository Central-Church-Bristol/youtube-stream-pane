# Waits for ProPresenter.exe, then launches Live Pane. When ProPresenter quits, Live Pane quits too.
# Installed into the Windows Startup folder by install-propresenter-watcher.ps1 or the Settings toggle.
# Logs to %LOCALAPPDATA%\Live Pane\watcher.log

$ErrorActionPreference = "Continue"

$dataDir = Join-Path $env:LOCALAPPDATA "Live Pane"
$logPath = Join-Path $dataDir "watcher.log"
$appPathFile = Join-Path $dataDir "app-path.txt"
$pollSeconds = 3

function Write-Log {
    param([string]$Message)
    try {
        if (-not (Test-Path $dataDir)) {
            New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
        }
        $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
        Add-Content -Path $logPath -Value $line -Encoding UTF8
    } catch {
        # Logging must never crash the watcher.
    }
}

function Reset-LogIfHuge {
    try {
        if ((Test-Path $logPath) -and ((Get-Item $logPath).Length -gt 1MB)) {
            $tail = Get-Content $logPath -Tail 200
            Set-Content -Path $logPath -Value $tail -Encoding UTF8
        }
    } catch { }
}

function Test-ProPresenter {
    # Exact process only. Helper processes stay running after ProPresenter quits.
    $null -ne (Get-Process -Name "ProPresenter" -ErrorAction SilentlyContinue)
}

function Get-LivePaneProcesses {
    Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -eq "Live Pane" -or $_.ProcessName -eq "LivePane"
    }
}

function Get-StartMenuLivePaneExe {
    $links = @(
        (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Live Pane.lnk"),
        (Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\Live Pane.lnk")
    )
    $shell = $null
    foreach ($lnk in $links) {
        if (-not (Test-Path $lnk)) { continue }
        try {
            if (-not $shell) { $shell = New-Object -ComObject WScript.Shell }
            $target = $shell.CreateShortcut($lnk).TargetPath
            if ($target -and (Test-Path $target) -and $target -like "*.exe") {
                return $target
            }
        } catch { }
    }
    return $null
}

function Resolve-LivePaneExe {
    if (Test-Path $appPathFile) {
        $hint = (Get-Content $appPathFile -Raw -ErrorAction SilentlyContinue).Trim()
        if ($hint -and (Test-Path $hint)) { return $hint }
    }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\live-pane\Live Pane.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Live Pane\Live Pane.exe"),
        (Join-Path ${env:ProgramFiles} "Live Pane\Live Pane.exe"),
        (Join-Path ${env:ProgramFiles} "live-pane\Live Pane.exe")
    )
    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) { return $path }
    }

    $fromMenu = Get-StartMenuLivePaneExe
    if ($fromMenu) { return $fromMenu }

    $uninst = Get-ChildItem "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall" -ErrorAction SilentlyContinue
    foreach ($key in $uninst) {
        try {
            $props = Get-ItemProperty $key.PSPath -ErrorAction SilentlyContinue
            if ($props.DisplayName -eq "Live Pane" -and $props.InstallLocation) {
                $exe = Join-Path $props.InstallLocation "Live Pane.exe"
                if (Test-Path $exe) { return $exe }
            }
        } catch { }
    }

    return $null
}

function Start-LivePane {
    $existing = Get-LivePaneProcesses
    if ($existing) {
        Write-Log ("Live Pane already running (pid {0})." -f ($existing.Id -join ", "))
        return $existing | Select-Object -First 1
    }

    $exe = Resolve-LivePaneExe
    if (-not $exe) {
        Write-Log "ERROR: Live Pane.exe not found. Install from Start Menu (npm.cmd run dist:win) or turn the setting on once from the app."
        return $null
    }

    Write-Log "Launching `"$exe`" --watch-propresenter"
    try {
        return Start-Process -FilePath $exe -ArgumentList "--watch-propresenter" -PassThru -WindowStyle Normal
    } catch {
        Write-Log ("ERROR: failed to launch Live Pane: {0}" -f $_.Exception.Message)
        return $null
    }
}

function Stop-LivePaneProcess {
    $procs = Get-LivePaneProcesses
    if (-not $procs) {
        Write-Log "Live Pane was not running."
        return
    }
    foreach ($proc in $procs) {
        Write-Log ("Closing Live Pane pid {0}." -f $proc.Id)
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

Reset-LogIfHuge
$resolvedExe = Resolve-LivePaneExe
if (-not $resolvedExe) { $resolvedExe = "(not found yet)" }
Write-Log "Watcher started. Waiting for ProPresenter.exe (helpers are ignored)."
Write-Log ("Live Pane.exe = {0}" -f $resolvedExe)
Write-Log ("ProPresenter.exe running = {0}" -f (Test-ProPresenter))

while ($true) {
    while (-not (Test-ProPresenter)) {
        Start-Sleep -Seconds $pollSeconds
    }

    Write-Log "ProPresenter.exe detected - waiting for stage displays to open."
    Start-Sleep -Seconds 6
    if (-not (Test-ProPresenter)) {
        Write-Log "ProPresenter exited during startup wait."
        continue
    }

    Write-Log "Opening Live Pane."
    $null = Start-LivePane

    while (Test-ProPresenter) {
        Start-Sleep -Seconds $pollSeconds
    }

    Write-Log "ProPresenter.exe closed - closing Live Pane."
    Stop-LivePaneProcess
    Start-Sleep -Seconds 2
}
