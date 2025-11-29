# Docker Cleanup Script for Windows
# Run this script to free up space taken by Docker

Write-Host "=== Docker Disk Usage ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== Cleaning up Docker ===" -ForegroundColor Cyan

# Remove all stopped containers
Write-Host "Removing stopped containers..." -ForegroundColor Yellow
docker container prune -f

# Remove all unused images (not just dangling)
Write-Host "Removing unused images..." -ForegroundColor Yellow
docker image prune -a -f

# Remove all unused volumes
Write-Host "Removing unused volumes..." -ForegroundColor Yellow
docker volume prune -f

# Remove all unused networks
Write-Host "Removing unused networks..." -ForegroundColor Yellow
docker network prune -f

# Remove all build cache
Write-Host "Removing build cache..." -ForegroundColor Yellow
docker builder prune -a -f

Write-Host "`n=== Final Disk Usage ===" -ForegroundColor Cyan
docker system df

Write-Host "`n=== Additional Cleanup Options ===" -ForegroundColor Cyan
Write-Host "To remove ALL unused data (including images, containers, volumes, networks, build cache):"
Write-Host "  docker system prune -a --volumes -f" -ForegroundColor Yellow
Write-Host "`nWARNING: This will remove everything that's not currently in use!" -ForegroundColor Red

