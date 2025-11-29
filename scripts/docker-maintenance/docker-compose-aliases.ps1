# PowerShell aliases/functions for docker-compose with automatic cleanup
# Add this to your PowerShell profile to use these commands automatically
# To add: Add-Content $PROFILE "`n. '$PSScriptRoot\docker-compose-aliases.ps1'"

# Function to replace docker-compose up
function docker-compose-up {
    param(
        [switch]$CleanupBefore = $false,
        [Parameter(ValueFromRemainingArguments=$true)]
        [string[]]$Args
    )
    
    $scriptPath = Join-Path $PSScriptRoot "docker-compose-up.ps1"
    if ($CleanupBefore) {
        & $scriptPath -CleanupBefore @Args
    } else {
        & $scriptPath @Args
    }
}

# Function to replace docker-compose down
function docker-compose-down {
    param(
        [switch]$SkipCleanup = $false,
        [switch]$SkipCompaction = $false,
        [Parameter(ValueFromRemainingArguments=$true)]
        [string[]]$Args
    )
    
    $scriptPath = Join-Path $PSScriptRoot "docker-compose-down.ps1"
    $params = @()
    if ($SkipCleanup) { $params += "-SkipCleanup" }
    if ($SkipCompaction) { $params += "-SkipCompaction" }
    & $scriptPath @params @Args
}

# Set aliases (optional - uncomment if you want to override docker-compose commands)
# Set-Alias -Name "docker-compose" -Value "docker-compose-wrapper" -Force
# Note: This would require a wrapper function that detects 'up' vs 'down' commands

Write-Host "Docker Compose aliases loaded!" -ForegroundColor Green
Write-Host "Use: docker-compose-up [args]" -ForegroundColor Cyan
Write-Host "Use: docker-compose-down [args]" -ForegroundColor Cyan
Write-Host "`nTo make these permanent, add to your PowerShell profile:" -ForegroundColor Yellow
Write-Host "  Add-Content `$PROFILE `. '$PSScriptRoot\docker-compose-aliases.ps1'" -ForegroundColor Gray

