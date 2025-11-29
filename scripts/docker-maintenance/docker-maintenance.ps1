# Docker Maintenance Script
# Run this script periodically (weekly/monthly) to keep Docker disk usage under control
# This script cleans up Docker resources AND compacts the WSL virtual disk

param(
    [switch]$SkipCompaction = $false
)

Write-Host "=== Docker Maintenance Script ===" -ForegroundColor Cyan
Write-Host "This script will clean up unused Docker resources and compact the WSL disk`n" -ForegroundColor Yellow

# Show current disk usage
Write-Host "=== Current Docker Disk Usage ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== Cleaning up unused resources ===" -ForegroundColor Cyan

# Remove stopped containers
Write-Host "`n1. Removing stopped containers..." -ForegroundColor Yellow
docker container prune -f

# Remove unused images (not just dangling)
Write-Host "`n2. Removing unused images..." -ForegroundColor Yellow
docker image prune -a -f

# Remove unused volumes (be careful - this removes volumes not attached to containers)
Write-Host "`n3. Removing unused volumes..." -ForegroundColor Yellow
Write-Host "   (Skipping volumes to avoid data loss. Run manually if needed: docker volume prune -f)" -ForegroundColor Gray
# docker volume prune -f  # Uncomment if you want to remove unused volumes

# Remove unused networks
Write-Host "`n4. Removing unused networks..." -ForegroundColor Yellow
docker network prune -f

# Remove build cache
Write-Host "`n5. Removing build cache..." -ForegroundColor Yellow
docker builder prune -a -f

# Show disk usage after cleanup
Write-Host "`n=== Docker Disk Usage After Cleanup ===" -ForegroundColor Cyan
docker system df

# Compact WSL disk if not skipped
if (-not $SkipCompaction) {
    Write-Host "`n=== Compacting WSL Virtual Disk ===" -ForegroundColor Cyan
    Write-Host "This will shrink the virtual disk to reclaim unused space..." -ForegroundColor Yellow
    
    # Check if running as Administrator
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    
    if (-not $isAdmin) {
        Write-Host "`n⚠️  WARNING: Not running as Administrator. Disk compaction requires admin privileges." -ForegroundColor Red
        Write-Host "To compact the disk, run this script as Administrator, or run:" -ForegroundColor Yellow
        Write-Host "  .\compact-wsl-disk.ps1" -ForegroundColor Gray
        Write-Host "`nSkipping disk compaction..." -ForegroundColor Yellow
    } else {
        # Shutdown WSL first
        Write-Host "Shutting down WSL..." -ForegroundColor Yellow
        wsl --shutdown
        Start-Sleep -Seconds 2
        
        # Run compaction
        $compactScript = Join-Path $PSScriptRoot "compact-wsl-disk.ps1"
        if (Test-Path $compactScript) {
            & $compactScript
        } else {
            Write-Host "Compaction script not found at: $compactScript" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "`nSkipping disk compaction (--SkipCompaction flag set)" -ForegroundColor Yellow
}

Write-Host "`n=== Maintenance Complete ===" -ForegroundColor Green
Write-Host "`n💡 Tip: Set up a scheduled task to run this script weekly/monthly" -ForegroundColor Cyan
Write-Host "   See: setup-scheduled-maintenance.ps1" -ForegroundColor Gray

