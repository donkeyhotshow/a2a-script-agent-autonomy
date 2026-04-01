#requires -Version 5.1
<#
.SYNOPSIS
    Standardized kill script for a2a-script-agent services.
.DESCRIPTION
    Implements dual verification pattern:
    1. Kill by port (find process listening on port, terminate it)
    2. Verify port is free
    3. Kill by PID/process name (from .pids.txt, by executable pattern)
    4. Verify no matching processes remain
    5. Clear .pids.txt only after verification
.NOTES
    See docs/SYSTEM_STARTUP.md and AGENTS.md (live stack restart)
#>

[CmdletBinding()]
param(
    [switch]$CheckOnly,
    [switch]$Force,
    [int]$VerifyAttempts = 20,
    [int]$VerifyDelayMs = 500
)

# Service definitions: name -> { port, processes, patterns }
$Services = @{
    'Ollama' = @{
        Port = 11434
        PidKey = 'OLLAMA_PID'
        Processes = @('ollama.exe')
        Patterns = @('ollama')
    }
    'ai-integration' = @{
        Port = 11435
        PidKey = 'AI_INTEGRATION_PID'
        Processes = @('python.exe', 'uvicorn.exe')
        Patterns = @('uvicorn', 'ai-integration', 'proxy.asgi')
    }
    'a2a-server' = @{
        Port = 3000
        PidKey = 'A2A_SERVER_PID'
        Processes = @('node.exe')
        Patterns = @('a2a-server', 'tsx', 'npm run dev')
    }
    'client-api' = @{
        Port = 3001
        PidKey = 'CLIENT_API_PID'
        Processes = @('node.exe')
        Patterns = @('client-api', 'sdk', 'npm run dev')
    }
    'web-ui' = @{
        Port = 5173
        PidKey = 'WEB_UI_PID'
        Processes = @('node.exe')
        Patterns = @('web-ui', 'a2a-client', 'vite')
    }
}

$PidFile = '.pids.txt'
$script:ExitCode = 0

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $colorMap = @{ 'INFO' = 'White'; 'OK' = 'Green'; 'WARN' = 'Yellow'; 'ERROR' = 'Red'; 'STEP' = 'Cyan' }
    $color = $colorMap[$Level] ?? 'White'
    $prefix = if ($Level -eq 'STEP') { "`n[$Level]" } else { "  [$Level]" }
    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            return @{ PID = $conn.OwningProcess; Name = $proc.Name; Path = $proc.Path }
        }
    } catch { }
    return $null
}

function Test-PortFree {
    param([int]$Port, [int]$Attempts = 5, [int]$DelayMs = 200)
    for ($i = 0; $i -lt $Attempts; $i++) {
        $proc = Get-ProcessOnPort -Port $Port
        if (-not $proc) { return $true }
        Start-Sleep -Milliseconds $DelayMs
    }
    return $false
}

function Get-PidsFromFile {
    $pids = @{}
    if (Test-Path $PidFile) {
        Get-Content $PidFile -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_ -match '^(\w+)=(\d+)\s*$') {
                $pids[$matches[1]] = [int]$matches[2]
            }
        }
    }
    return $pids
}

function Stop-ProcessByPid {
    param([int]$ProcessId, [string]$Reason)
    try {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $proc) {
            Write-Log "PID $ProcessId not found (already terminated)" 'OK'
            return $true
        }
        Write-Log "Killing PID $ProcessId ($($proc.Name)) - $Reason" 'WARN'
        Stop-Process -Id $ProcessId -Force
        Start-Sleep -Milliseconds 300
        if (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
            Write-Log "PID $ProcessId still alive after Stop-Process" 'ERROR'
            return $false
        }
        Write-Log "PID $ProcessId terminated" 'OK'
        return $true
    } catch {
        Write-Log "Failed to kill PID $ProcessId : $_" 'ERROR'
        return $false
    }
}

function Stop-ProcessByName {
    param([string]$Name)
    $procs = Get-Process -Name $Name -ErrorAction SilentlyContinue
    if (-not $procs) { return 0 }
    $count = 0
    foreach ($proc in $procs) {
        try {
            Write-Log "Killing $($proc.Name) PID $($proc.Id)" 'WARN'
            Stop-Process -Id $proc.Id -Force
            $count++
        } catch {
            Write-Log "Failed to kill $($proc.Name) PID $($proc.Id) : $_" 'ERROR'
        }
    }
    return $count
}

function Test-ProcessesGone {
    param([array]$Patterns, [array]$ProcessNames)
    $found = @()
    # Check by process name
    foreach ($name in $ProcessNames) {
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if ($procs) { $found += $procs }
    }
    # Check by pattern in command line (requires CIM)
    if ($Patterns) {
        try {
            $cimProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
                foreach ($pat in $Patterns) {
                    if ($_.CommandLine -match $pat -or $_.Name -match $pat) { return $true }
                }
                return $false
            }
            foreach ($p in $cimProcs) {
                if ($found.Id -notcontains $p.ProcessId) {
                    $found += [PSCustomObject]@{ Id = $p.ProcessId; Name = $p.Name }
                }
            }
        } catch { }
    }
    return $found
}

function Clear-PidFile {
    if (Test-Path $PidFile) {
        Remove-Item $PidFile -Force
        Write-Log ".pids.txt deleted" 'OK'
    } else {
        Write-Log ".pids.txt not present" 'INFO'
    }
}

# ============================================================
# MAIN EXECUTION
# ============================================================

Write-Log "=== kill-all.ps1 : Dual-verification process termination ===" 'STEP'
Write-Log "Mode: $(if ($CheckOnly) { 'CHECK-ONLY' } else { 'KILL' })"

$pidsFromFile = Get-PidsFromFile
Write-Log "Loaded $($pidsFromFile.Count) PID entries from $PidFile"

$failedServices = @()
$verifiedCount = 0

foreach ($svcName in $Services.Keys | Sort-Object) {
    $svc = $Services[$svcName]
    Write-Log "`n--- Processing $svcName (port $($svc.Port)) ---" 'STEP'

    # Step 1: Kill by port
    $portProc = Get-ProcessOnPort -Port $svc.Port
    if ($portProc) {
        if ($CheckOnly) {
            Write-Log "PORT CHECK: $($svc.Port) occupied by PID $($portProc.PID) ($($portProc.Name))" 'WARN'
        } else {
            Write-Log "Port $($svc.Port) occupied by PID $($portProc.PID) - terminating" 'WARN'
            $result = Stop-ProcessByPid -ProcessId $portProc.PID -Reason "listening on port $($svc.Port)"
            if (-not $result) { $failedServices += $svcName }
        }
    } else {
        Write-Log "Port $($svc.Port) already free" 'OK'
    }

    # Step 2: Verify port is free
    if (-not $CheckOnly) {
        $portFree = Test-PortFree -Port $svc.Port -Attempts $VerifyAttempts -DelayMs $VerifyDelayMs
        if ($portFree) {
            Write-Log "Port $($svc.Port) verified free" 'OK'
        } else {
            Write-Log "Port $($svc.Port) still occupied after termination attempts" 'ERROR'
            $failedServices += $svcName
        }
    }

    # Step 3: Kill by PID from .pids.txt
    $expectedPid = $pidsFromFile[$svc.PidKey]
    if ($expectedPid) {
        if ($CheckOnly) {
            $proc = Get-Process -Id $expectedPid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Log "PID FILE: $svcName expected at PID $expectedPid ($($proc.Name)) - still running" 'WARN'
            } else {
                Write-Log "PID FILE: $svcName expected at PID $expectedPid - already terminated" 'OK'
            }
        } else {
            Write-Log "Checking PID from file: $svcName = PID $expectedPid"
            $result = Stop-ProcessByPid -ProcessId $expectedPid -Reason "from $PidFile"
            if (-not $result) { $failedServices += $svcName }
        }
    } else {
        Write-Log "No PID entry for $svcName in $PidFile" 'INFO'
    }

    # Step 4: Kill by process name/pattern
    if (-not $CheckOnly) {
        foreach ($procName in $svc.Processes) {
            $killed = Stop-ProcessByName -Name $procName
            if ($killed -gt 0) { Write-Log "Killed $killed $procName instance(s)" 'OK' }
        }
    }

    # Step 5: Verify processes gone
    Start-Sleep -Milliseconds 500
    $remaining = Test-ProcessesGone -Patterns $svc.Patterns -ProcessNames $svc.Processes
    if ($remaining) {
        Write-Log "$svcName : $($remaining.Count) process(es) still found" 'WARN'
        foreach ($r in $remaining | Select-Object -First 3) {
            Write-Log "  Remaining: PID $($r.Id) ($($r.Name))" 'WARN'
        }
        if (-not $CheckOnly) { $failedServices += $svcName }
    } else {
        Write-Log "$svcName verified terminated" 'OK'
        $verifiedCount++
    }
}

# Step 6: Clear .pids.txt only after verification
if (-not $CheckOnly) {
    if ($failedServices.Count -eq 0) {
        Clear-PidFile
    } else {
        Write-Log "`nFAILED to fully terminate: $($failedServices -join ', ')" 'ERROR'
        Write-Log ".pids.txt preserved for manual inspection" 'WARN'
        $script:ExitCode = 1
    }
}

# Summary
Write-Log "`n=== Summary ===" 'STEP'
Write-Log "Services verified clean: $verifiedCount / $($Services.Count)"
if ($failedServices.Count -gt 0) {
    Write-Log "Failed services: $($failedServices -join ', ')" 'ERROR'
}
if ($CheckOnly) {
    Write-Log "Check-only mode complete" 'INFO'
} else {
    Write-Log "Kill operation complete (exit code: $script:ExitCode)" $(if ($script:ExitCode -eq 0) { 'OK' } else { 'ERROR' })
}

exit $script:ExitCode
