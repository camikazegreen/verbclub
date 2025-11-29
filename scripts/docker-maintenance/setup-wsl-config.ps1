# Script to set up WSL configuration for disk size management
# This creates/updates the .wslconfig file in your user profile

$wslConfigPath = "$env:USERPROFILE\.wslconfig"
$wslConfigContent = @"
# WSL2 Configuration
# Settings to manage WSL2 resource usage and prevent disk bloat

[wsl2]
# Memory limit (adjust based on your system)
memory=4GB

# Number of processors to use
processors=2

# Swap space
swap=2GB

# Enable localhost forwarding
localhostForwarding=true

# Experimental features to help with disk management
[experimental]
# Use sparse VHD (helps with disk space)
sparseVhd=true
# Automatically reclaim memory
autoMemoryReclaim=gradual
# Enable host address loopback
hostAddressLoopback=true
"@

Write-Host "=== WSL Configuration Setup ===" -ForegroundColor Cyan

if (Test-Path $wslConfigPath) {
    Write-Host "Found existing .wslconfig file at: $wslConfigPath" -ForegroundColor Yellow
    $backup = "$wslConfigPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $wslConfigPath $backup
    Write-Host "Backed up existing config to: $backup" -ForegroundColor Green
}

Write-Host "`nCreating/updating .wslconfig file..." -ForegroundColor Yellow
$wslConfigContent | Out-File -FilePath $wslConfigPath -Encoding UTF8

Write-Host "✅ WSL configuration updated!" -ForegroundColor Green
Write-Host "`nLocation: $wslConfigPath" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANT: You need to restart WSL for changes to take effect:" -ForegroundColor Yellow
Write-Host "   wsl --shutdown" -ForegroundColor Gray
Write-Host "   (Then restart Docker Desktop)" -ForegroundColor Gray

Write-Host "`nNote: WSL2 virtual disks can still grow, but these settings help manage resources." -ForegroundColor Yellow
Write-Host "Run the disk compaction script periodically to reclaim space." -ForegroundColor Yellow

