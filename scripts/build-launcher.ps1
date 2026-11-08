# Compile Live Pane.exe, the Start Menu launcher that runs npm.cmd run desktop.
#   powershell -ExecutionPolicy Bypass -File scripts\build-launcher.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "The .NET Framework C# compiler was not found."
}

$source = Join-Path $projectRoot "launcher\LivePaneLauncher.cs"
$icon = Join-Path $projectRoot "build\icon.ico"
$out = Join-Path $projectRoot "Live Pane.exe"
if (-not (Test-Path $icon)) {
    throw "Missing $icon"
}

& $csc /nologo /target:winexe /win32icon:$icon /out:$out $source
if ($LASTEXITCODE -ne 0) {
    throw "csc exited $LASTEXITCODE"
}

Write-Host "Launcher:"
Write-Host "  $out"
