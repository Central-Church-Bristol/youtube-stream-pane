# Remove Live Pane from Windows startup. The app itself is not uninstalled.
$startup = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startup "Live Pane.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "Removed Live Pane from startup."
} else {
    Write-Host "No Live Pane startup shortcut was found."
}
