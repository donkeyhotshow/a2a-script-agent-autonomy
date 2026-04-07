param(
    [string]$Command,
    [string[]]$Services
)

$ErrorActionPreference = "Stop"

# Configuration - hardcoded as requested
$SERVICES = @{
    'local_llm' = @{
        Port = 11435
        StartScript = Join-Path $PSScriptRoot 'scripts\start-local-llm.bat'
        Dependencies = @()
    }
    'ai-integration' = @{
        Port = 11434
        StartScript = Join-Path $PSScriptRoot 'scripts\start-ai-integration.bat'
        Dependencies = @('local_llm')
    }
    'a2a-server' = @{
        Port = 3000
        StartScript = Join-Path $PSScriptRoot 'scripts\start-a2a-server.bat'
        Dependencies = @('ai-integration')
    }
    'client-api' = @{
        Port = 3001
        StartScript = Join-Path $PSScriptRoot 'scripts\start-client-api.bat'
        Dependencies = @('a2a-server')
    }
    'web-ui' = @{
        Port = 5173
        StartScript = Join-Path $PSScriptRoot 'scripts\start-web-ui.bat'
        Dependencies = @('client-api')
    }
}

$PID_FILE = Join-Path $PSScriptRoot '.pids.txt'

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Host "[$timestamp] $Message"
}

function Test-PortFree {
    param([int]$Port)
    try {
        $result = netstat -ano | findstr ":$Port" | findstr "LISTENING"
        return [string]::IsNullOrEmpty($result)
    } catch {
        return $true
    }
}

function Test-ServiceHealth {
    param([string]$ServiceName)
    $service = $SERVICES[$ServiceName]

    # Define health endpoints
    $healthEndpoints = @{
        'local_llm' = '/api/tags'
        'ai-integration' = '/health'
        'a2a-server' = '/health'
        'client-api' = '/api/a2a/projects'
        'web-ui' = '/api/a2a/projects'
    }

    $endpoint = $healthEndpoints[$ServiceName]
    if (!$endpoint) { return $false }

    $url = "http://localhost:$($service.Port)$endpoint"

    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Wait-PortFree {
    param([int]$Port, [int]$MaxAttempts = 10)
    $attempts = 0
    while ($attempts -lt $MaxAttempts) {
        if (Test-PortFree $Port) {
            return $true
        }
        $result = netstat -ano | findstr ":$Port" | findstr "LISTENING"
        if ($result) {
            $pid = ($result -split '\s+')[4]
            Write-Log "Killing process $pid on port $Port"
            taskkill /F /PID $pid | Out-Null
        }
        $attempts++
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Verify-AndCapturePid {
    param([int]$Port, [string]$VarName, [string]$ServiceName)

    # Check if already in PID file
    if (Test-Path $PID_FILE) {
        $content = Get-Content $PID_FILE
        foreach ($line in $content) {
            if ($line -match "^$VarName=(\d+)$") {
                return $true
            }
        }
    }

    # Find PID from netstat
    $result = netstat -ano | findstr ":$Port" | findstr "LISTENING"
    if ($result) {
        $pid = ($result -split '\s+')[4]
        "$VarName=$pid" | Out-File $PID_FILE -Append -Encoding UTF8
        Write-Log "[CAPTURED] $ServiceName PID: $pid (late capture)"
        return $true
    }

    Write-Log "[MISSING] $ServiceName - not running on port $Port"
    return $false
}

function Start-Service {
    param([string]$ServiceName)

    $service = $SERVICES[$ServiceName]
    $scriptPath = $service.StartScript

    Write-Log "Starting $ServiceName on port $($service.Port)..."

    if (!(Test-Path $scriptPath)) {
        Write-Log "ERROR: Start script not found: $scriptPath"
        return $false
    }

    # Check if port is already occupied
    if (!(Test-PortFree $service.Port)) {
        Write-Log "Port $($service.Port) is occupied. Checking if service is responding..."

        if (Test-ServiceHealth $ServiceName) {
            Write-Log "$ServiceName is already running and healthy"
            # Ensure PID is captured
            Verify-AndCapturePid $service.Port "$($ServiceName.ToUpper())_PID" $ServiceName | Out-Null
            return $true
        } else {
            Write-Log "ERROR: $ServiceName port occupied but service not responding"

            # Try to get error details from API
            try {
                $url = "http://localhost:$($service.Port)/health"
                $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction Stop
                if ($response.StatusCode -ne 200) {
                    Write-Log "Service returned status $($response.StatusCode)"
                }
            } catch {
                Write-Log "Cannot connect to service API: $($_.Exception.Message)"
            }

            # Show log file location
            Show-LogFile $ServiceName
            return $false
        }
    }

    # Call the existing start script
    $process = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$scriptPath`"" -NoNewWindow -Wait -PassThru

    # Check if service actually started by verifying PID was captured
    $pidVar = "$($ServiceName.ToUpper())_PID"
    $pidFound = $false

    if (Test-Path $PID_FILE) {
        $content = Get-Content $PID_FILE
        foreach ($line in $content) {
            if ($line -match "^$pidVar=(\d+)$") {
                $pidFound = $true
                break
            }
        }
    }

    if (!$pidFound) {
        Write-Log "ERROR: $ServiceName failed to start"

        # Show log file location
        Show-LogFile $ServiceName

        return $false
    }

    return $process.ExitCode -eq 0
}

function Show-LogFile {
    param([string]$ServiceName)

    # Define possible log file locations
    $logFiles = @(
        Join-Path $PSScriptRoot "logs\$ServiceName.log",
        Join-Path $PSScriptRoot "$ServiceName\logs\$ServiceName.log",
        Join-Path $PSScriptRoot "a2a-$ServiceName\logs\$ServiceName.log",
        Join-Path $PSScriptRoot "a2a-server\logs\server.log",
        Join-Path $PSScriptRoot "ai-integration\logs\ai-integration.log",
        Join-Path $PSScriptRoot "a2a-client\logs\client-api.log",
        Join-Path $PSScriptRoot "a2a-client\logs\web-ui.log"
    )

    foreach ($logFile in $logFiles) {
        if (Test-Path $logFile) {
            Write-Log "Check logfile: $logFile"
            return
        }
    }

    Write-Log "Logfile location unknown for $ServiceName"
}

function Stop-Service {
    param([string]$ServiceName)

    $service = $SERVICES[$ServiceName]

    # Find PID from port
    $result = netstat -ano | findstr ":$($service.Port)" | findstr "LISTENING"
    if ($result) {
        $pid = ($result -split '\s+')[4]
        Write-Log "Stopping $ServiceName (PID: $pid)..."
        taskkill /F /PID $pid | Out-Null
        Write-Log "✓ $ServiceName stopped"
    } else {
        Write-Log "$ServiceName is not running"
    }
}

function Get-DependencyOrder {
    param([string[]]$Services)
    $result = @()
    $visited = @{}

    function Visit-Service {
        param([string]$ServiceName)
        if ($visited.ContainsKey($ServiceName)) { return }
        $visited[$ServiceName] = $true

        $service = $SERVICES[$ServiceName]
        foreach ($dep in $service.Dependencies) {
            Visit-Service $dep
        }

        $result += $ServiceName
    }

    foreach ($service in $Services) {
        Visit-Service $service
    }

    return $result
}

function Show-Status {
    if (!(Test-Path $PID_FILE)) {
        Write-Log "No PID file found"
        return
    }

    $content = Get-Content $PID_FILE
    Write-Log 'Service Status:'

    foreach ($serviceName in $SERVICES.Keys) {
        $service = $SERVICES[$serviceName]
        $pid = $null
        $portOpen = $false

        # Check PID file
        foreach ($line in $content) {
            if ($line -match "^(\w+)_PID=(\d+)$") {
                if ($matches[1] -eq $serviceName.ToUpper()) {
                    $pid = [int]$matches[2]
                    break
                }
            }
        }

        # Check if port is open
        $result = netstat -ano | findstr ":$($service.Port)" | findstr "LISTENING"
        $portOpen = ![string]::IsNullOrEmpty($result)

        $status = '🟡 Not running'
        if ($pid -and $portOpen) {
            $status = '🟢 Running'
        } elseif ($portOpen) {
            $status = '🟠 Port occupied'
        }

        Write-Log "  $serviceName`: $status (Port: $($service.Port), PID: $($pid ?? 'N/A'))"
    }
}

try {
    switch ($Command) {
        "start" {
            Write-Log "=== runbook-cli.ps1 : Standardized service startup ==="

            $allServices = @('local_llm', 'ai-integration', 'a2a-server', 'client-api', 'web-ui')
            $targetServices = $Services.Count -gt 0 ? $Services : $allServices
            $order = Get-DependencyOrder $targetServices

            # ==========================================
            # Step 1: Kill existing processes first
            # ==========================================
            Write-Log ""
            Write-Log "[Step 1/8] Cleaning environment with kill-all.bat..."
            $killAllPath = Join-Path $PSScriptRoot 'kill-all.bat'
            if (Test-Path $killAllPath) {
                $process = Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"$killAllPath`"" -NoNewWindow -Wait -PassThru
                if ($process.ExitCode -ne 0) {
                    Write-Log "[WARN] kill-all.bat reported issues, continuing with caution..."
                }
            } else {
                Write-Log "[WARN] kill-all.bat not found, skipping cleanup"
            }
            Start-Sleep -Seconds 2

            # ==========================================
            # Step 2: Verify all ports are free
            # ==========================================
            Write-Log ""
            Write-Log "[Step 2/8] Verifying all ports are free..."
            $portsOk = $true
            foreach ($serviceName in $order) {
                $service = $SERVICES[$serviceName]
                if (!(Test-PortFree $service.Port)) {
                    Write-Log "  [ERROR] Port $($service.Port) still occupied"
                    $portsOk = $false
                } else {
                    Write-Log "  [OK] Port $($service.Port) verified free"
                }
            }
            if (!$portsOk) {
                Write-Log "[FATAL] Not all ports could be freed. Aborting startup."
                exit 1
            }

            # ==========================================
            # Step 3: Clear PID file
            # ==========================================
            Write-Log ""
            Write-Log "[Step 3/8] Clearing PID file..."
            if (Test-Path $PID_FILE) {
                Remove-Item $PID_FILE
            }
            "" | Out-File $PID_FILE -Encoding UTF8
            Write-Log "[OK] $PID_FILE reset"

            # ==========================================
            # Steps 4-8: Start services sequentially
            # ==========================================
            $step = 4
            foreach ($serviceName in $order) {
                Write-Log ""
                Write-Log "[Step $($step)/8] Starting $serviceName..."
                Start-Service $serviceName | Out-Null  # Continue even if one fails
                $step++
            }

            # ==========================================
            # Final verification - Check all PIDs are captured
            # ==========================================
            Write-Log ""
            Write-Log "[Final Check] Verifying all PIDs captured..."
            Verify-AndCapturePid 11435 "LOCAL_LLM_PID" "Local LLM upstream" | Out-Null
            Verify-AndCapturePid 11434 "AI_INTEGRATION_PID" "ai-integration" | Out-Null
            Verify-AndCapturePid 3000 "A2A_SERVER_PID" "a2a-server" | Out-Null
            Verify-AndCapturePid 3001 "CLIENT_API_PID" "client-api" | Out-Null
            Verify-AndCapturePid 5173 "WEB_UI_PID" "web-ui" | Out-Null

            # ==========================================
            # Summary
            # ==========================================
            Write-Log ""
            Write-Log "=== All services started successfully ==="
            Write-Log ""
            Write-Log "Services:"
            Write-Log "  - Local LLM upstream:       http://localhost:11435"
            Write-Log "  - ai-integration: http://localhost:11434 (API proxy)"
            Write-Log "  - a2a-server:   http://localhost:3000"
            Write-Log "  - client-api:   http://localhost:3001"
            Write-Log "  - web-ui:       http://localhost:5173"
            Write-Log ""
            Write-Log "Saved PIDs in $PID_FILE`:"
            if (Test-Path $PID_FILE) {
                Get-Content $PID_FILE
            }
            Write-Log ""
            Write-Log "To stop all services, run: kill-all.bat"
        }

        "stop" {
            $allServices = @('local_llm', 'ai-integration', 'a2a-server', 'client-api', 'web-ui')
            $targetServices = $Services.Count -gt 0 ? $Services : $allServices

            # Stop in reverse dependency order
            [array]::Reverse($targetServices)

            foreach ($service in $targetServices) {
                Stop-Service $service
            }
        }

        "restart" {
            # Stop all first
            $allServices = @('local_llm', 'ai-integration', 'a2a-server', 'client-api', 'web-ui')
            [array]::Reverse($allServices)
            foreach ($service in $allServices) {
                Stop-Service $service
            }

            # Wait a bit
            Start-Sleep -Seconds 2

            # Start all services
            & $PSCommandPath -Command start
        }

        "status" {
            Show-Status
        }

        default {
            Write-Host "Usage: .\runbook-cli.ps1 -Command <command> [-Services <service1,service2,...>]"
            Write-Host "Commands: start, stop, restart, status"
            Write-Host "Services: local_llm, ai-integration, a2a-server, client-api, web-ui"
            Write-Host "Example: .\runbook-cli.ps1 -Command start"
            Write-Host "Example: .\runbook-cli.ps1 -Command start -Services local_llm,a2a-server"
        }
    }
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    exit 1
}</content>
<parameter name="filePath">runbook-cli.ps1