#requires -Version 5.1
<#
.SYNOPSIS
    Standardized start script for a2a-script-agent services.
.DESCRIPTION
    Implements standardized startup pattern:
    1. Call kill-all.ps1 to ensure clean environment
    2. Verify all ports are free (dual verification)
    3. Clear .pids.txt only after verification
    4. Start services in dependency order
    5. Capture and save PIDs
    6. Verify services are ready via health checks
.NOTES
    Following docs/troubleshooting/standardize-stop-scripts.md
#>

[CmdletBinding()]
param(
    [switch]$SkipKill,
    [switch]$SkipOllama,
    [switch]$SkipAiIntegration,
    [switch]$SkipServer,
    [switch]$SkipClientApi,
    [switch]$SkipWebUi,
    [int]$PortVerifyAttempts = 20,
    [int]$HealthCheckTimeoutSec = 30
)

# Configuration
$Config = @{
    PidFile = '.pids.txt'
    OllamaModels = 'C:\Users\dev\Desktop\.ollama'
    Services = @(
        @{ Name = 'Ollama'; Port = 11435; PidKey = 'OLLAMA_PID'; Enabled = -not $SkipOllama;
           Command = { param($p) & ollama serve }; WorkingDir = $null; HealthUrl = 'http://localhost:11435/api/tags'; LogFile = $null }
        @{ Name = 'ai-integration'; Port = 11434; PidKey = 'AI_INTEGRATION_PID'; Enabled = -not $SkipAiIntegration;
           Command = { param($p) & python -m uvicorn proxy.asgi:application --host 0.0.0.0 --port $p }; WorkingDir = 'ai-integration'; HealthUrl = $null; LogFile = 'logs/ai.log' }
        @{ Name = 'a2a-server'; Port = 3000; PidKey = 'A2A_SERVER_PID'; Enabled = -not $SkipServer;
           Command = { param($p) & npm run dev }; WorkingDir = 'a2a-server'; HealthUrl = 'http://localhost:3000/health'; LogFile = 'logs/server.log' }
        @{ Name = 'client-api'; Port = 3001; PidKey = 'CLIENT_API_PID'; Enabled = -not $SkipClientApi;
           Command = { param($p) & npm run dev }; WorkingDir = 'a2a-client/packages/sdk'; HealthUrl = 'http://localhost:3001/health'; LogFile = '../../logs/client-api.log' }
        @{ Name = 'web-ui'; Port = 5173; PidKey = 'WEB_UI_PID'; Enabled = -not $SkipWebUi;
           Command = { param($p) & npm run dev }; WorkingDir = 'a2a-client'; HealthUrl = 'http://localhost:5173'; LogFile = 'logs/web-ui.log' }
    )
}

$script:ExitCode = 0
$StartedPids = @{}

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $colorMap = @{ 'INFO' = 'White'; 'OK' = 'Green'; 'WARN' = 'Yellow'; 'ERROR' = 'Red'; 'STEP' = 'Cyan' }
    $color = $colorMap[$Level] ?? 'White'
    $prefix = if ($Level -eq 'STEP') { "`n[$Level]" } else { "  [$Level]" }
    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Test-PortFree {
    param([int]$Port, [int]$Attempts = 20, [int]$DelayMs = 500)
    for ($i = 0; $i -lt $Attempts; $i++) {
        try {
            $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
            if (-not $conn) { return $true }
            # Try to kill any process on this port
            if ($conn.OwningProcess) {
                $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Log "Port $Port still held by PID $($conn.OwningProcess), killing..." 'WARN'
                    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                }
            }
        } catch { }
        Start-Sleep -Milliseconds $DelayMs
    }
    return $false
}

function Invoke-KillAll {
    param([switch]$CheckOnly)
    $killScript = Join-Path $PSScriptRoot 'kill-all.ps1'
    if (-not (Test-Path $killScript)) {
        Write-Log "kill-all.ps1 not found at $killScript" 'ERROR'
        return $false
    }
    Write-Log "Executing: kill-all.ps1 $(if ($CheckOnly) { '-CheckOnly' })" 'STEP'
    try {
        & $killScript -CheckOnly:$CheckOnly
        return $LASTEXITCODE -eq 0
    } catch {
        Write-Log "Error executing kill-all.ps1: $_" 'ERROR'
        return $false
    }
}

function Clear-PidFile {
    if (Test-Path $Config.PidFile) {
        Remove-Item $Config.PidFile -Force
        Write-Log "Cleared $Config.PidFile" 'OK'
    }
    # Create empty file
    '' | Set-Content $Config.PidFile
}

function Save-Pid {
    param([string]$Key, [int]$ProcessId)
    "$Key=$ProcessId" | Add-Content $Config.PidFile
    $StartedPids[$Key] = $ProcessId
    Write-Log "Saved PID: $Key = $ProcessId" 'OK'
}

function Get-PidOnPort {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) { return $conn.OwningProcess }
    } catch { }
    return $null
}

function Start-Service {
    param([hashtable]$Svc)
    Write-Log "`n--- Starting $($Svc.Name) on port $($Svc.Port) ---" 'STEP'

    # Verify port is free
    Write-Log "Verifying port $($Svc.Port) is free..."
    $portFree = Test-PortFree -Port $Svc.Port -Attempts $PortVerifyAttempts
    if (-not $portFree) {
        Write-Log "Port $($Svc.Port) is still occupied after cleanup" 'ERROR'
        return $false
    }
    Write-Log "Port $($Svc.Port) verified free" 'OK'

    # Prepare environment
    $env:OLLAMA_HOST = "0.0.0.0:$($Svc.Port)"
    $env:OLLAMA_MODELS = $Config.OllamaModels
    $env:OLLAMA_ORIGINS = "*"

    # Start process
    $originalDir = Get-Location
    try {
        if ($Svc.WorkingDir) { Set-Location $Svc.WorkingDir }
        
        Write-Log "Executing: $($Svc.Command.ToString().Trim())"
        
        # Prepare log redirection
        $logArg = ""
        if ($Svc.LogFile) {
            $logPath = Join-Path (Get-Location) $Svc.LogFile
            $logDir = Split-Path $logPath -Parent
            if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
            $logArg = " *> '$logPath' 2>&1"
            Write-Log "Logging to: $logPath" 'INFO'
        }

        # Use Start-Process for proper PID capture and background execution
        $commandString = "& { cd '$((Get-Location).Path)'; & { $($Svc.Command.ToString()) } param($($Svc.Port)) }$logArg"
        $proc = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $commandString `
            -PassThru -WindowStyle Hidden
        
        Start-Sleep -Seconds 2
        
        # Verify process started and capture PID
        $actualPid = Get-PidOnPort -Port $Svc.Port
        if (-not $actualPid) {
            # Fallback: check if process is still running
            try {
                $proc.Refresh()
                if (-not $proc.HasExited) { $actualPid = $proc.Id }
            } catch { }
        }
        
        if ($actualPid) {
            Save-Pid -Key $Svc.PidKey -ProcessId $actualPid
        } else {
            Write-Log "Could not determine PID for $($Svc.Name)" 'WARN'
        }
        
        # Wait for service to be ready
        Write-Log "Waiting for $($Svc.Name) to be ready..."
        $ready = $false
        for ($i = 0; $i -lt $HealthCheckTimeoutSec; $i++) {
            # Check if process died
            if ($proc.HasExited) {
                Write-Log "$($Svc.Name) process exited prematurely (code: $($proc.ExitCode))" 'ERROR'
                return $false
            }
            # Health check
            if ($Svc.HealthUrl) {
                try {
                    $resp = Invoke-WebRequest -Uri $Svc.HealthUrl -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($resp.StatusCode -eq 200) {
                        $ready = $true
                        break
                    }
                } catch { }
            } else {
                # For services without health URL, check port is listening
                $listening = Get-NetTCPConnection -LocalPort $Svc.Port -State Listen -ErrorAction SilentlyContinue
                if ($listening) {
                    $ready = $true
                    break
                }
            }
            Start-Sleep -Seconds 1
        }
        
        if ($ready) {
            Write-Log "$($Svc.Name) is ready" 'OK'
            return $true
        } else {
            Write-Log "$($Svc.Name) failed to become ready within ${HealthCheckTimeoutSec}s" 'ERROR'
            return $false
        }
    } finally {
        Set-Location $originalDir
    }
}

# ============================================================
# MAIN EXECUTION
# ============================================================

Write-Log "=== start-all.ps1 : Standardized service startup ===" 'STEP'

# Step 1: Kill existing processes (unless skipped)
if (-not $SkipKill) {
    if (-not (Invoke-KillAll -CheckOnly)) {
        Write-Log "Environment not clean, attempting full kill..." 'WARN'
        if (-not (Invoke-KillAll)) {
            Write-Log "Failed to clean environment. Use -SkipKill to override." 'ERROR'
            exit 1
        }
    }
    Write-Log "Environment verified clean" 'OK'
} else {
    Write-Log "Skipping kill phase (-SkipKill specified)" 'WARN'
}

# Step 2: Clear PID file only after verification
Clear-PidFile

# Step 3: Start services
$started = @()
$failed = @()

foreach ($svc in $Config.Services | Where-Object { $_.Enabled }) {
    $result = Start-Service -Svc $svc
    if ($result) {
        $started += $svc.Name
    } else {
        $failed += $svc.Name
        Write-Log "Stopping due to failure in $($svc.Name)" 'ERROR'
        break
    }
}

# Step 4: Summary
Write-Log "`n=== Summary ===" 'STEP'
Write-Log "Started ($($started.Count)): $($started -join ', ')" 'OK'
if ($failed.Count -gt 0) {
    Write-Log "Failed ($($failed.Count)): $($failed -join ', ')" 'ERROR'
    $script:ExitCode = 1
}

if ($StartedPids.Count -gt 0) {
    Write-Log "`nSaved PIDs in $($Config.PidFile):" 'INFO'
    Get-Content $Config.PidFile | ForEach-Object { Write-Log $_ 'INFO' }
}

Write-Log "`nTo stop all services, run: .\kill-all.ps1" 'INFO'

exit $script:ExitCode
