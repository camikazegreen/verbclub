# Script to set up a scheduled task for automatic Docker maintenance
# This will run the docker-maintenance.ps1 script weekly to prevent disk bloat

param(
    [string]$Schedule = "Weekly",  # Weekly, Monthly, or Daily
    [string]$DayOfWeek = "Sunday",  # For weekly: Sunday, Monday, etc.
    [string]$Time = "02:00"         # Time to run (2 AM by default)
)

Write-Host "=== Docker Maintenance Scheduler Setup ===" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "`n❌ ERROR: This script must be run as Administrator to create scheduled tasks." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    exit 1
}

$scriptPath = Join-Path $PSScriptRoot "docker-maintenance.ps1"
$taskName = "DockerMaintenance"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "`n⚠️  Scheduled task '$taskName' already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to update it? (Y/N)"
    if ($response -ne "Y" -and $response -ne "y") {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the action (what to run)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Create the trigger based on schedule
switch ($Schedule.ToLower()) {
    "daily" {
        $trigger = New-ScheduledTaskTrigger -Daily -At $Time
    }
    "weekly" {
        $day = [System.DayOfWeek]::$DayOfWeek
        $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $day -At $Time
    }
    "monthly" {
        $trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At $Time
    }
    default {
        Write-Host "Invalid schedule. Use: Daily, Weekly, or Monthly" -ForegroundColor Red
        exit 1
    }
}

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

# Create the principal (run as current user with highest privileges)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Automated Docker maintenance: cleans up unused resources and compacts WSL disk to prevent disk bloat"
    
    Write-Host "`n✅ Scheduled task created successfully!" -ForegroundColor Green
    Write-Host "`nTask Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName" -ForegroundColor Gray
    Write-Host "  Schedule: $Schedule" -ForegroundColor Gray
    if ($Schedule -eq "Weekly") {
        Write-Host "  Day: $DayOfWeek" -ForegroundColor Gray
    }
    Write-Host "  Time: $Time" -ForegroundColor Gray
    Write-Host "  Script: $scriptPath" -ForegroundColor Gray
    
    Write-Host "`n💡 To view or modify the task:" -ForegroundColor Yellow
    Write-Host "  1. Open Task Scheduler (taskschd.msc)" -ForegroundColor Gray
    Write-Host "  2. Look for task: $taskName" -ForegroundColor Gray
    Write-Host "`n💡 To remove the task:" -ForegroundColor Yellow
    Write-Host "  Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Error creating scheduled task: $_" -ForegroundColor Red
    exit 1
}

