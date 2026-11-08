# Install or update Live Pane from the newest installer in release\, and tidy up
# what older setups left behind. Quit Live Pane first, then run:
#   powershell -ExecutionPolicy Bypass -File scripts\install-app.ps1
# Add -DryRun to only list what it would do.

param([switch]$DryRun)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$installDir = Join-Path $env:LOCALAPPDATA "Programs\live-pane"
$installedExe = Join-Path $installDir "Live Pane.exe"
$appPathFile = Join-Path $env:LOCALAPPDATA "Live Pane\app-path.txt"
$watcherShortcut = Join-Path ([Environment]::GetFolderPath("Startup")) "Live Pane ProPresenter Watcher.lnk"
$commonShortcut = Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs\Live Pane.lnk"
$userShortcut = Join-Path ([Environment]::GetFolderPath("Programs")) "Live Pane.lnk"

function Step([string]$Message) {
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
}

function Act([string]$Message, [scriptblock]$Action) {
    if ($DryRun) {
        Write-Host "  (dry run) would $Message" -ForegroundColor Yellow
        return
    }
    Write-Host "  $Message"
    & $Action
}

function Stop-With([string]$Message) {
    if ($DryRun) {
        Write-Host "  (dry run) would stop here: $Message" -ForegroundColor Yellow
        return
    }
    throw $Message
}

function Get-ShortcutTarget([string]$Path) {
    (New-Object -ComObject WScript.Shell).CreateShortcut($Path).TargetPath
}

# A project-folder launcher is a "Live Pane.exe" that sits next to package.json.
function Test-ProjectLauncher([string]$Path) {
    $Path -and (Split-Path $Path -Leaf) -eq "Live Pane.exe" -and (Test-Path (Join-Path (Split-Path $Path) "package.json"))
}

Step "Checking Live Pane is closed..."
$open = Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.ProcessName -eq "Live Pane" -or ($_.ProcessName -eq "electron" -and $_.Path -like "*\node_modules\electron\*")
}
if ($open) {
    Stop-With "Live Pane is still open. Right-click its tray icon (bottom right of the screen), choose Quit Live Pane, then run this again."
}
if (Get-NetTCPConnection -LocalPort 43147 -State Listen -ErrorAction SilentlyContinue) {
    Stop-With "Port 43147 is still in use, probably by a leftover Live Pane helper. Restart the PC, then run this again."
}

$installer = Get-ChildItem (Join-Path $projectRoot "release") -Filter "LivePane-*-windows.exe" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $installer) {
    throw "No installer in $projectRoot\release. Build one first: npm.cmd run dist:win"
}
Write-Host "  Installer: $($installer.FullName)"

# An installed copy whose uninstaller is damaged would make the installer stop
# with "Failed to uninstall old application files", so remove that copy first.
Step "Checking the copy already installed..."
$uninstallRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall"
foreach ($key in @(Get-ChildItem $uninstallRoot -ErrorAction SilentlyContinue)) {
    $props = Get-ItemProperty $key.PSPath
    if ($props.DisplayName -ne "Live Pane") { continue }
    $uninstaller = $null
    if ($props.UninstallString -match '^"([^"]+)"') { $uninstaller = $Matches[1] }
    $healthy = $false
    if ($uninstaller -and (Test-Path $uninstaller)) {
        # Every working NSIS uninstaller carries this marker in its data.
        $healthy = [Text.Encoding]::ASCII.GetString([IO.File]::ReadAllBytes($uninstaller)).Contains("NullsoftInst")
    }
    if ($healthy) {
        Write-Host "  Version $($props.DisplayVersion) is installed; the installer will update it."
        continue
    }
    $guid = $key.PSChildName
    $dir = (Get-ItemProperty "HKCU:\Software\$guid" -ErrorAction SilentlyContinue).InstallLocation
    if (-not $dir -and $uninstaller) { $dir = Split-Path -Parent $uninstaller }
    Write-Host "  Version $($props.DisplayVersion) is installed, but its uninstaller is damaged."
    if ($dir -and (Test-Path $dir)) {
        Act "delete the old copy: $dir" { Remove-Item -LiteralPath $dir -Recurse -Force }
    }
    Act "remove its Apps & features entry" {
        Remove-Item -LiteralPath $key.PSPath -Recurse -Force
        Remove-Item -LiteralPath "HKCU:\Software\$guid" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Step "Installing..."
Act "run $($installer.Name). Live Pane opens when it finishes." {
    $process = Start-Process -FilePath $installer.FullName -PassThru
    $null = $process.Handle  # keeps the exit code readable after it exits
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "The installer stopped (code $($process.ExitCode)). Live Pane still opens the old way, from the project folder."
    }
    if (-not (Test-Path $installedExe)) {
        throw "The installer finished, but $installedExe is missing. Live Pane still opens the old way, from the project folder."
    }
}

# The installer adds its own per-user "Live Pane" shortcut. An all-users one
# that opens the project-folder launcher would start the development version.
Step "Tidying Start menu shortcuts..."
if ((Test-Path $commonShortcut) -and (Test-ProjectLauncher (Get-ShortcutTarget $commonShortcut))) {
    Act "remove the old all-users shortcut to the development launcher" {
        try {
            # The shortcut belongs to this user, so they may give themselves
            # permission to delete it.
            $sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
            & icacls.exe $commonShortcut /grant "*${sid}:(D)" | Out-Null
            # No -Force: that also rewrites the file's attributes, which this
            # Delete permission doesn't allow.
            Remove-Item -LiteralPath $commonShortcut -ErrorAction Stop
        } catch {
            Write-Warning "Couldn't remove $commonShortcut. It opens the old development version. Someone with this PC's admin password can delete it."
        }
    }
} else {
    Write-Host "  Nothing to tidy."
}

# Live Pane records itself for the ProPresenter watcher when it starts, if
# "Start when ProPresenter runs" is on. Wait for that, or record it here.
if (Test-Path $watcherShortcut) {
    Step "Pointing the ProPresenter watcher at the installed app..."
    Act "record $installedExe in $appPathFile" {
        $deadline = (Get-Date).AddSeconds(30)
        while ((Get-Date) -lt $deadline) {
            $current = (Get-Content -LiteralPath $appPathFile -Raw -ErrorAction SilentlyContinue)
            if ($current -and $current.Trim() -eq $installedExe) { break }
            Start-Sleep -Seconds 2
        }
        $current = (Get-Content -LiteralPath $appPathFile -Raw -ErrorAction SilentlyContinue)
        if (-not $current -or $current.Trim() -ne $installedExe) {
            Set-Content -LiteralPath $appPathFile -Value $installedExe -Encoding UTF8
        }
    }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Nothing was changed." -ForegroundColor Yellow
    return
}

Step "Checking the result..."
$ok = $true
$description = (Get-Item $installedExe).VersionInfo.FileDescription
Write-Host ("  Installed app name: {0}" -f $description)
if ($description -ne "Live Pane") { $ok = $false }
if (Test-Path $userShortcut) {
    $target = Get-ShortcutTarget $userShortcut
    Write-Host "  Start menu shortcut opens: $target"
    if ($target -ne $installedExe) { $ok = $false }
} else {
    Write-Host "  Start menu shortcut: missing"
    $ok = $false
}
if (Test-Path $watcherShortcut) {
    $recorded = (Get-Content -LiteralPath $appPathFile -Raw -ErrorAction SilentlyContinue)
    Write-Host "  ProPresenter watcher opens: $($recorded.Trim())"
    if ($recorded.Trim() -ne $installedExe) { $ok = $false }
}
$running = Get-Process -Name "Live Pane" -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $installedExe }
Write-Host ("  Live Pane running from the installed copy: {0}" -f [bool]$running)

Write-Host ""
if ($ok) {
    Write-Host "Done. Task Manager should now list Live Pane as 'Live Pane', with its own icon." -ForegroundColor Green
} else {
    Write-Host "Finished, but something above doesn't look right. Copy this window's text to Claude." -ForegroundColor Red
}
