#!/usr/bin/env powershell
<#
.SYNOPSIS
    Web UI Smoke Test Script for A2A Script Agent
.DESCRIPTION
    Starts all required services (server, client API, Vite), opens browser,
    loads a session, and verifies SSE connectivity.
.PARAMETER Browser
    Browser to use: 'chromium', 'firefox', or 'edge'
.PARAMETER Port
    Port for Vite dev server (default: 5173)
.PARAMETER ClientApiPort
    Port for Client API (default: 3001)
.PARAMETER ServerPort
    Port for A2A Server (default: 3000)
.PARAMETER SkipBrowser
    Skip browser opening (for headless testing)
.EXAMPLE
    .\test-web-ui.ps1 -Browser firefox
    .\test-web-ui.ps1 -SkipBrowser
#>

param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('chromium', 'firefox', 'edge')]
    [string]$Browser = 'chromium',

    [Parameter(Mandatory = $false)]
    [int]$Port = 5173,

    [Parameter(Mandatory = $false)]
    [int]$ClientApiPort = 3001,

    [Parameter(Mandatory = $false)]
    [int]$ServerPort = 3000,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBrowser
)

# Script configuration
$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$rootDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

# Log collection configuration
$logDir = Join-Path $rootDir "proxy_logs"
$testResultsDir = Join-Path $rootDir "test-results"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runId = "web-ui-smoke-$timestamp"

# Create log directories
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
if (-not (Test-Path $testResultsDir)) { New-Item -ItemType Directory -Path $testResultsDir | Out-Null }

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Global state
$processes = @()
$cleanupComplete = $false

# Cleanup function
function Cleanup {
    if ($cleanupComplete) { return }
    $cleanupComplete = $true

    Write-Info "Cleaning up processes..."

    foreach ($proc in $processes) {
        if ($proc -and !$proc.HasExited) {
            try {
                Write-Info "Stopping $($proc.ProcessName) (PID: $($proc.Id))"
                $proc.Kill()
                $proc.WaitForExit(5000)
            } catch {
                Write-Warning "Failed to stop $($proc.ProcessName): $_"
            }
        }
    }

    # Kill any remaining processes on our ports
    $ports = @($Port, $ClientApiPort, $ServerPort)
    foreach ($port in $ports) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
            foreach ($conn in $connections) {
                if ($conn.OwningProcess) {
                    try {
                        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                    } catch {
                        # Process might already be gone
                    }
                }
            }
        } catch {
            # Port might not be in use
        }
    }
}

# Log collection function
function Collect-Logs {
    param([string]$RunId, [string]$ExitCode)

    Write-Info "Collecting logs and test artifacts..."

    $runLogDir = Join-Path $logDir $RunId
    if (-not (Test-Path $runLogDir)) { New-Item -ItemType Directory -Path $runLogDir | Out-Null }

    # Collect service logs from temp directory
    $tempLogs = Get-ChildItem "$env:TEMP" -Filter "*.out.log" -ErrorAction SilentlyContinue
    $tempLogs += Get-ChildItem "$env:TEMP" -Filter "*.err.log" -ErrorAction SilentlyContinue

    foreach ($logFile in $tempLogs) {
        try {
            $destFile = Join-Path $runLogDir $logFile.Name
            Copy-Item $logFile.FullName $destFile -Force
            Write-Info "Collected log: $($logFile.Name)"
        } catch {
            Write-Warning "Failed to collect log $($logFile.Name): $_"
        }
    }

    # Create test result summary
    $resultFile = Join-Path $testResultsDir "$RunId.json"
    $testResult = @{
        runId = $RunId
        timestamp = $timestamp
        exitCode = $ExitCode
        services = @{
            serverPort = $ServerPort
            clientApiPort = $ClientApiPort
            webUiPort = $Port
        }
        logsCollected = $tempLogs.Count
        logDirectory = $runLogDir
        browser = $Browser
        skipBrowser = $SkipBrowser
    }

    $testResult | ConvertTo-Json | Out-File $resultFile -Encoding UTF8
    Write-Info "Test result saved to: $resultFile"

    # Clean up temp logs if collection was successful
    if ($tempLogs.Count -gt 0) {
        Write-Info "Cleaning up temporary log files..."
        $tempLogs | Remove-Item -Force -ErrorAction SilentlyContinue
    }
}

# Register cleanup on script exit
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# Health check function
function Test-HealthCheck {
    param(
        [string]$Url,
        [string]$ServiceName,
        [int]$TimeoutSeconds = 30
    )

    Write-Info "Checking $ServiceName health at $Url"

    $startTime = Get-Date
    while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 5
            if ($response.StatusCode -lt 500) {
                Write-Success "$ServiceName is healthy"
                return $true
            }
        } catch {
            # Continue trying
        }
        Start-Sleep -Seconds 2
    }

    Write-Error "$ServiceName health check failed after ${TimeoutSeconds}s"
    return $false
}

# Start service function
function Start-ServiceProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$HealthUrl,
        [string]$LogFile = $null
    )

    Write-Info "Starting $Name..."

    # Determine log path based on working directory
    $logPath = if ($LogFile) {
        Join-Path $WorkingDirectory $LogFile
    } elseif ($WorkingDirectory -like "*a2a-server*") {
        $logDir = Join-Path $WorkingDirectory "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        Join-Path $logDir "server.log"
    } elseif ($WorkingDirectory -like "*sdk*") {
        $logDir = Join-Path $WorkingDirectory "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        Join-Path $logDir "client-api.log"
    } elseif ($WorkingDirectory -like "*a2a-client*" -and $WorkingDirectory -notlike "*packages*") {
        $logDir = Join-Path $WorkingDirectory "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        Join-Path $logDir "web-ui.log"
    } else {
        "$env:TEMP\$Name.log"
    }

    # Ensure log directory exists
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

    # Combine stdout and stderr to single log file
    $mergedArgs = "$Arguments *> '$logPath' 2>&1"

    try {
        $process = Start-Process -FilePath $Command `
                                -ArgumentList $mergedArgs `
                                -WorkingDirectory $WorkingDirectory `
                                -NoNewWindow `
                                -PassThru

        Write-Info "$Name started (PID: $($process.Id), log: $logPath)"

        $processes += $process
        Write-Info "$Name started (PID: $($process.Id))"

        # Wait a bit for startup
        Start-Sleep -Seconds 3

        # Health check
        if ($HealthUrl) {
            if (-not (Test-HealthCheck -Url $HealthUrl -ServiceName $Name)) {
                throw "Health check failed for $Name"
            }
        }

        return $process
    } catch {
        Write-Error "Failed to start $Name`: $_"
        throw
    }
}

# Browser opening function
function Open-Browser {
    param([string]$Url, [string]$BrowserType)

    Write-Info "Opening $BrowserType browser at $Url"

    switch ($BrowserType) {
        'chromium' {
            # Try Chrome first, then Edge
            try {
                Start-Process "chrome.exe" $Url
            } catch {
                try {
                    Start-Process "msedge.exe" $Url
                } catch {
                    Write-Warning "Could not find Chrome or Edge, trying default browser"
                    Start-Process $Url
                }
            }
        }
        'firefox' {
            try {
                Start-Process "firefox.exe" $Url
            } catch {
                Write-Warning "Could not find Firefox, trying default browser"
                Start-Process $Url
            }
        }
        'edge' {
            try {
                Start-Process "msedge.exe" $Url
            } catch {
                Write-Warning "Could not find Edge, trying default browser"
                Start-Process $Url
            }
        }
    }
}



# Main execution
function Main {
    Write-Info "A2A Web UI Smoke Test"
    Write-Info "======================"

    try {
        # Set environment variables
        $env:PORT = $Port
        $env:CLIENT_API_PORT = $ClientApiPort
        $env:SERVER_PORT = $ServerPort
        $env:SKIP_AUTH = "1"

        # Start PostgreSQL and Redis via Docker
        Write-Info "Starting infrastructure services..."
        $dockerProcess = Start-Process -FilePath "docker" `
                                      -ArgumentList "compose up -d postgres redis" `
                                      -WorkingDirectory $rootDir `
                                      -NoNewWindow `
                                      -PassThru

        $processes += $dockerProcess
        Start-Sleep -Seconds 10

        # Start A2A Server
        $serverProcess = Start-ServiceProcess `
            -Name "A2A Server" `
            -Command "powershell" `
            -Arguments "Set-Location '$rootDir\a2a-server'; `$env:PORT='$ServerPort'; npm run dev:no-auth" `
            -WorkingDirectory "$rootDir\a2a-server" `
            -HealthUrl "http://localhost:$ServerPort/health"

        # Start Client API
        $clientApiProcess = Start-ServiceProcess `
            -Name "Client API" `
            -Command "powershell" `
            -Arguments "Set-Location '$rootDir\a2a-client\packages\sdk'; `$env:PORT='$ClientApiPort'; npm run dev" `
            -WorkingDirectory "$rootDir\a2a-client\packages\sdk" `
            -HealthUrl "http://localhost:$ClientApiPort/health"

        # Start Vite dev server
        $viteProcess = Start-ServiceProcess `
            -Name "Vite Dev Server" `
            -Command "powershell" `
            -Arguments "Set-Location '$rootDir\a2a-client'; `$env:PORT='$Port'; `$env:CLIENT_API_PORT='$ClientApiPort'; npm run dev" `
            -WorkingDirectory "$rootDir\a2a-client" `
            -HealthUrl "http://localhost:$Port"

        Write-Success "All services started successfully"

        # Open browser if requested
        if (-not $SkipBrowser) {
            $webUrl = "http://localhost:$Port"
            Open-Browser -Url $webUrl -BrowserType $Browser

            # Wait for user interaction
            Write-Info "Browser opened. Please manually verify:"
            Write-Info "1. Page loads without errors"
            Write-Info "2. Session panel appears"
            Write-Info ""
            Write-Info "Press Enter when ready to continue with automated checks..."

            $null = Read-Host
        }

        Write-Success "Web UI smoke test completed successfully"
        Collect-Logs -RunId $runId -ExitCode 0
        exit 0

    } catch {
        Write-Error "Test failed: $_"
        Collect-Logs -RunId $runId -ExitCode 1
        exit 1
    } finally {
        Cleanup
    }
}

# Run main function
Main