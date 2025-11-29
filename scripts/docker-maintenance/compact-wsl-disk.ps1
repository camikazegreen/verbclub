# Script to compact Docker WSL disk using diskpart
$vhdxPath = "$env:LOCALAPPDATA\Docker\wsl\disk\docker_data.vhdx"

if (-not (Test-Path $vhdxPath)) {
    Write-Host "Error: Docker WSL disk not found at $vhdxPath" -ForegroundColor Red
    exit 1
}

$sizeBefore = (Get-Item $vhdxPath).Length / 1GB
Write-Host "Docker WSL disk found: $vhdxPath" -ForegroundColor Cyan
Write-Host "Current size: $([math]::Round($sizeBefore, 2)) GB" -ForegroundColor Yellow

# Create diskpart script
$diskpartScript = @"
select vdisk file="$vhdxPath"
compact vdisk
"@

$scriptPath = "$env:TEMP\compact_docker_disk.txt"
$diskpartScript | Out-File -FilePath $scriptPath -Encoding ASCII

Write-Host "`nCompacting disk using diskpart (this may take several minutes)..." -ForegroundColor Yellow
Write-Host "Please wait..." -ForegroundColor Yellow

# Run diskpart
$result = diskpart /s $scriptPath 2>&1

# Clean up temp script
Remove-Item $scriptPath -ErrorAction SilentlyContinue

# Check if compaction was successful
if ($LASTEXITCODE -eq 0) {
    $sizeAfter = (Get-Item $vhdxPath).Length / 1GB
    Write-Host "`n=== Compaction Complete ===" -ForegroundColor Green
    Write-Host "Size after compaction: $([math]::Round($sizeAfter, 2)) GB" -ForegroundColor Green
    Write-Host "Space freed: $([math]::Round($sizeBefore - $sizeAfter, 2)) GB" -ForegroundColor Green
} else {
    Write-Host "`nCompaction may have encountered an issue. Check the output above." -ForegroundColor Yellow
    Write-Host "You may need to run this as Administrator." -ForegroundColor Yellow
}

