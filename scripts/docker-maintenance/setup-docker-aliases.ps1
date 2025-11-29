# Script to set up docker-compose aliases in your PowerShell profile
# This makes the cleanup-enabled docker-compose commands available automatically

Write-Host "=== Docker Compose Aliases Setup ===" -ForegroundColor Cyan

# Get the profile path
$profilePath = $PROFILE

# Check if profile exists
if (-not (Test-Path $profilePath)) {
    Write-Host "Creating PowerShell profile..." -ForegroundColor Yellow
    $profileDir = Split-Path $profilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

# Get the path to the aliases script (relative to profile)
$aliasesScript = Join-Path $PSScriptRoot "docker-compose-aliases.ps1"
$aliasesScriptRelative = Resolve-Path $aliasesScript -Relative

# Check if already added
$profileContent = Get-Content $profilePath -ErrorAction SilentlyContinue
$alreadyAdded = $profileContent | Where-Object { $_ -like "*docker-compose-aliases.ps1*" }

if ($alreadyAdded) {
    Write-Host "`n⚠️  Aliases already added to profile." -ForegroundColor Yellow
    $response = Read-Host "Do you want to update it? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    # Remove old entry
    $newContent = $profileContent | Where-Object { $_ -notlike "*docker-compose-aliases.ps1*" }
    $newContent | Set-Content $profilePath
}

# Add the aliases script to profile
$importLine = ". '$aliasesScript'"
Add-Content -Path $profilePath -Value "`n# Docker Compose aliases with automatic cleanup"
Add-Content -Path $profilePath -Value $importLine

Write-Host "`n✅ Aliases added to PowerShell profile!" -ForegroundColor Green
Write-Host "`nProfile location: $profilePath" -ForegroundColor Cyan
Write-Host "`nTo use the new commands:" -ForegroundColor Yellow
Write-Host "  1. Restart PowerShell, or run: . `$PROFILE" -ForegroundColor Gray
Write-Host "  2. Use: docker-compose-up [args]" -ForegroundColor Gray
Write-Host "  3. Use: docker-compose-down [args]" -ForegroundColor Gray
Write-Host "`nThese commands will automatically run cleanup when starting/stopping containers." -ForegroundColor Cyan

Write-Host "`nOptions:" -ForegroundColor Yellow
Write-Host "  docker-compose-up -CleanupBefore    # Clean up before starting" -ForegroundColor Gray
Write-Host "  docker-compose-down -SkipCompaction # Skip disk compaction (faster)" -ForegroundColor Gray
Write-Host "  docker-compose-down -SkipCleanup    # Skip cleanup entirely" -ForegroundColor Gray

