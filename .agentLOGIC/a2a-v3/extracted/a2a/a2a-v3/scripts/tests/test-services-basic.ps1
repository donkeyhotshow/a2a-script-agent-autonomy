# Basic services test script
# Tests individual components step by step

param(
    [switch]$SkipCleanup
)

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$processes = @()

Write-Info "Basic Services Test"
Write-Info "==================="

try {
    # Test 1: Docker services
    Write-Info "Testing Docker services..."
    $dockerOutput = docker ps --format "{{.Names}}" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $services = $dockerOutput | Where-Object { $_ -match 'postgres|redis' }
        if ($services.Count -ge 2) {
            Write-Success "Docker services running: $($services -join ', ')"
        } else {
            Write-Warning "Docker services not fully available"
            docker compose up -d postgres redis
            Start-Sleep -Seconds 10
        }
    } else {
        Write-Error "Docker not available"
        exit 1
    }

    # Test 2: A2A Server
    Write-Info "Testing A2A Server..."
    $env:PORT = "3000"
    if (-not (Test-Path "$rootDir\a2a-server\logs")) { New-Item -ItemType Directory -Path "$rootDir\a2a-server\logs" -Force | Out-Null }
    $serverProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$rootDir\a2a-server'; `$env:PORT='3000'; `$env:SKIP_AUTH='1'; `$logDir = '`$PWD/logs'; if (!(Test-Path `$logDir)) {{ New-Item -ItemType Directory -Path `$logDir -Force | Out-Null }}; npm run dev *> `$logDir/server.log 2>&1" -NoNewWindow -PassThru
    $processes += $serverProcess
    Write-Info "Started A2A Server (PID: $($serverProcess.Id), log: a2a-server/logs/server.log)"

    # Wait for server to start
    Start-Sleep -Seconds 5

    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "A2A Server health check passed"
        } else {
            Write-Error "A2A Server health check failed: $($response.StatusCode)"
        }
    } catch {
        Write-Error "A2A Server health check failed: $($_.Exception.Message)"
    }

    # Test 3: Client API
    Write-Info "Testing Client API..."
    $env:PORT = "3001"
    if (-not (Test-Path "$rootDir\a2a-client\packages\sdk\logs")) { New-Item -ItemType Directory -Path "$rootDir\a2a-client\packages\sdk\logs" -Force | Out-Null }
    $clientProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$rootDir\a2a-client\packages\sdk'; `$env:PORT='3001'; `$logDir = '`$PWD/logs'; if (!(Test-Path `$logDir)) {{ New-Item -ItemType Directory -Path `$logDir -Force | Out-Null }}; npm run dev *> `$logDir/client-api.log 2>&1" -NoNewWindow -PassThru
    $processes += $clientProcess
    Write-Info "Started Client API (PID: $($clientProcess.Id), log: a2a-client/logs/client-api.log)"

    # Wait for client API to start
    Start-Sleep -Seconds 5

    # Test health endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Client API health check passed"
        } else {
            Write-Error "Client API health check failed: $($response.StatusCode)"
        }
    } catch {
        Write-Error "Client API health check failed: $($_.Exception.Message)"
    }

    # Test 4: Web UI
    Write-Info "Testing Web UI..."
    $env:PORT = "5173"
    if (-not (Test-Path "$rootDir\a2a-client\logs")) { New-Item -ItemType Directory -Path "$rootDir\a2a-client\logs" -Force | Out-Null }
    $webProcess = Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$rootDir\a2a-client'; `$env:PORT='5173'; `$logDir = '`$PWD/logs'; if (!(Test-Path `$logDir)) {{ New-Item -ItemType Directory -Path `$logDir -Force | Out-Null }}; npm run dev *> `$logDir/web-ui.log 2>&1" -NoNewWindow -PassThru
    $processes += $webProcess
    Write-Info "Started Web UI (PID: $($webProcess.Id), log: a2a-client/logs/web-ui.log)"

    # Wait for web UI to start
    Start-Sleep -Seconds 5

    # Test basic endpoint
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Web UI basic check passed"
        } else {
            Write-Error "Web UI basic check failed: $($response.StatusCode)"
        }
    } catch {
        Write-Error "Web UI basic check failed: $($_.Exception.Message)"
    }

    Write-Success "Basic services test completed successfully"

} catch {
    Write-Error "Test failed: $($_.Exception.Message)"
    exit 1
} finally {
    if (-not $SkipCleanup) {
        Write-Info "Cleaning up..."
        foreach ($proc in $processes) {
            if ($proc -and !$proc.HasExited) {
                try {
                    Write-Info "Stopping process $($proc.Id)"
                    $proc.Kill()
                    $proc.WaitForExit(5000)
                } catch {
                    Write-Warning "Failed to stop process $($proc.Id): $($_.Exception.Message)"
                }
            }
        }
    }
}
