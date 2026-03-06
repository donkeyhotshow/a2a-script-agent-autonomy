# Quick dev server starter for a2a-server
# Usage: .\start-dev.ps1

Write-Host "Starting a2a-server in dev mode..." -ForegroundColor Cyan

# Kill existing node processes on port 3000
$existing = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($existing) {
    $proc = Get-Process -Id $existing.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "Killing existing process on port 3000 (PID: $($proc.Id))" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force
        Start-Sleep -Seconds 2
    }
}

# Ensure logs directory exists
$logDir = Join-Path (Resolve-Path "a2a-server").Path "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$logFile = Join-Path $logDir "server.log"

# Start a2a-server with log redirection
$serverJob = Start-Job -ScriptBlock {
    param($cwd, $log)
    Set-Location $cwd
    npm run dev *> $log 2>&1
} -ArgumentList (Resolve-Path "a2a-server").Path, $logFile

Write-Host "a2a-server started (Job ID: $($serverJob.Id))" -ForegroundColor Green
Write-Host "Log: $logFile" -ForegroundColor Gray

# Wait for server to start
Start-Sleep -Seconds 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "a2a-server is UP!" -ForegroundColor Green
    }
} catch {
    Write-Host "Server started but health check failed - check logs" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To stop: Get-Job | Stop-Job" -ForegroundColor Gray
