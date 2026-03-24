#!/usr/bin/env powershell

<#
.SYNOPSIS
    Sets up scheduled smoke test retrospectives for continuous improvement

.DESCRIPTION
    Creates scheduled tasks to run smoke test retrospective analysis:
    - Daily retrospectives at 6 AM
    - Weekly retrospectives every Monday at 6 AM
    - Generates reports in test-results/ directory

.PARAMETER Install
    Install scheduled tasks

.PARAMETER Uninstall
    Remove scheduled tasks

.PARAMETER Test
    Run a test retrospective without scheduling

.EXAMPLE
    .\setup-retrospectives.ps1 -Install
    .\setup-retrospectives.ps1 -Uninstall
    .\setup-retrospectives.ps1 -Test
#>

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Test
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$taskNameDaily = "A2A-Smoke-Retrospective-Daily"
$taskNameWeekly = "A2A-Smoke-Retrospective-Weekly"

function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-ErrorLog { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

function Test-Retrospective {
    Write-Info "Running test retrospective analysis..."

    try {
        $testResultsDir = Join-Path $rootDir "test-results"
        if (-not (Test-Path $testResultsDir)) {
            New-Item -ItemType Directory -Path $testResultsDir | Out-Null
        }

        # Create some mock test results for testing
        $mockResults = @(
            @{
                runId = "web-ui-smoke-test-20240306_060000"
                timestamp = "20240306_060000"
                exitCode = 0
                services = @{
                    serverPort = 3000
                    clientApiPort = 3001
                    webUiPort = 5173
                }
                browser = "chromium"
                skipBrowser = $true
            },
            @{
                runId = "web-ui-smoke-test-20240306_120000"
                timestamp = "20240306_120000"
                exitCode = 0
                services = @{
                    serverPort = 3000
                    clientApiPort = 3001
                    webUiPort = 5173
                }
                browser = "chromium"
                skipBrowser = $true
            },
            @{
                runId = "web-ui-smoke-test-20240306_180000"
                timestamp = "20240306_180000"
                exitCode = 1
                services = @{
                    serverPort = 3000
                    clientApiPort = $null
                    webUiPort = 5173
                }
                browser = "chromium"
                skipBrowser = $true
            }
        )

        foreach ($result in $mockResults) {
            $filename = "$($result.runId).json"
            $filepath = Join-Path $testResultsDir $filename
            $result | ConvertTo-Json | Out-File $filepath -Encoding UTF8
        }

        Write-Success "Created mock test results for testing"

        # Run the retrospective analysis
        Push-Location $rootDir
        try {
            & node scripts/smoke-retrospective.js --period daily
        } finally {
            Pop-Location
        }

        Write-Success "Test retrospective completed successfully"
    } catch {
        Write-ErrorLog "Test retrospective failed: $_"
    }
}

function Install-ScheduledTasks {
    Write-Info "Installing scheduled smoke test retrospectives..."

    $nodePath = (Get-Command node).Source
    $scriptPath = Join-Path $scriptDir "smoke-retrospective.js"

    # Verify Node.js and script exist
    if (-not (Test-Path $nodePath)) {
        Write-ErrorLog "Node.js not found at $nodePath"
        return
    }

    if (-not (Test-Path $scriptPath)) {
        Write-ErrorLog "Retrospective script not found at $scriptPath"
        return
    }

    # Daily retrospective task
    Write-Info "Creating daily retrospective task..."
    try {
        $dailyAction = New-ScheduledTaskAction -Execute $nodePath -Argument "scripts/smoke-retrospective.js --period daily --quiet" -WorkingDirectory $rootDir
        $dailyTrigger = New-ScheduledTaskTrigger -Daily -At 6AM
        $dailySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

        Register-ScheduledTask -TaskName $taskNameDaily -Action $dailyAction -Trigger $dailyTrigger -Settings $dailySettings -Description "Daily smoke test retrospective analysis" -Force | Out-Null
        Write-Success "Daily retrospective task created (runs at 6:00 AM daily)"
    } catch {
        Write-ErrorLog "Failed to create daily task: $_"
    }

    # Weekly retrospective task
    Write-Info "Creating weekly retrospective task..."
    try {
        $weeklyAction = New-ScheduledTaskAction -Execute $nodePath -Argument "scripts/smoke-retrospective.js --period weekly --quiet" -WorkingDirectory $rootDir
        $weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 6AM
        $weeklySettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

        Register-ScheduledTask -TaskName $taskNameWeekly -Action $weeklyAction -Trigger $weeklyTrigger -Settings $weeklySettings -Description "Weekly smoke test retrospective analysis" -Force | Out-Null
        Write-Success "Weekly retrospective task created (runs every Monday at 6:00 AM)"
    } catch {
        Write-ErrorLog "Failed to create weekly task: $_"
    }

    Write-Info "Scheduled tasks created successfully!"
    Write-Info "View tasks with: Get-ScheduledTask -TaskName '$taskNameDaily', '$taskNameWeekly'"
    Write-Info "Manual run: npm run retrospective:daily or npm run retrospective:weekly"
}

function Uninstall-ScheduledTasks {
    Write-Info "Removing scheduled smoke test retrospectives..."

    $tasksRemoved = 0

    # Remove daily task
    try {
        $dailyTask = Get-ScheduledTask -TaskName $taskNameDaily -ErrorAction SilentlyContinue
        if ($dailyTask) {
            Unregister-ScheduledTask -TaskName $taskNameDaily -Confirm:$false
            Write-Success "Daily retrospective task removed"
            $tasksRemoved++
        } else {
            Write-Warning "Daily task not found"
        }
    } catch {
        Write-ErrorLog "Failed to remove daily task: $_"
    }

    # Remove weekly task
    try {
        $weeklyTask = Get-ScheduledTask -TaskName $taskNameWeekly -ErrorAction SilentlyContinue
        if ($weeklyTask) {
            Unregister-ScheduledTask -TaskName $taskNameWeekly -Confirm:$false
            Write-Success "Weekly retrospective task removed"
            $tasksRemoved++
        } else {
            Write-Warning "Weekly task not found"
        }
    } catch {
        Write-ErrorLog "Failed to remove weekly task: $_"
    }

    if ($tasksRemoved -eq 0) {
        Write-Warning "No retrospective tasks were found to remove"
    } else {
        Write-Success "Removed $tasksRemoved retrospective task(s)"
    }
}

function Show-Help {
    Write-Info "A2A Smoke Test Retrospective Setup"
    Write-Info "=================================="
    Write-Info ""
    Write-Info "This script sets up automated retrospective analysis of smoke test results."
    Write-Info ""
    Write-Info "Parameters:"
    Write-Info "  -Install    Create scheduled tasks for daily/weekly retrospectives"
    Write-Info "  -Uninstall  Remove scheduled tasks"
    Write-Info "  -Test       Run a test retrospective with mock data"
    Write-Info ""
    Write-Info "Scheduled Tasks:"
    Write-Info "  Daily:  Runs at 6:00 AM every day"
    Write-Info "  Weekly: Runs at 6:00 AM every Monday"
    Write-Info ""
    Write-Info "Reports are saved to: test-results/smoke-retrospective-*.json"
    Write-Info ""
    Write-Info "Manual execution:"
    Write-Info "  npm run retrospective:daily"
    Write-Info "  npm run retrospective:weekly"
}

# Main logic
if ($Install) {
    Install-ScheduledTasks
} elseif ($Uninstall) {
    Uninstall-ScheduledTasks
} elseif ($Test) {
    Test-Retrospective
} else {
    Show-Help
}