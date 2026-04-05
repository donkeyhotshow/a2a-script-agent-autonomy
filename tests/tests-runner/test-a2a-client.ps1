# A2A Client Level 3 Testing Script
# Comprehensive E2E testing of A2A Client components
# Tests: Client API HTTP → Web UI → Server → AI Integration

param(
    [switch]$SkipCleanup,
    [switch]$Verbose,
    [string]$SessionId = "test-session-$(Get-Date -Format 'yyyyMMddHHmmss')",
    [string]$ApiUrl = "http://localhost:3001",
    [string]$WebUrl = "http://localhost:5173",
    [string]$ServerUrl = "http://localhost:3000"
)

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

$rootDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$processes = @()
$testResults = @{}

Write-Info "A2A Client Level 3 Testing"
Write-Info "=========================="
Write-Info "Session ID: $SessionId"
Write-Info "API URL: $ApiUrl"
Write-Info "Web URL: $WebUrl"
Write-Info "Server URL: $ServerUrl"
Write-Host ""

try {
    # Test 1: Client API HTTP Availability
    Write-Info "Test 1: Client API HTTP Availability"
    try {
        $response = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Client API health check passed"
            $testResults["client_api_health"] = $true
        } else {
            Write-Error "Client API health check failed: $($response.StatusCode)"
            $testResults["client_api_health"] = $false
        }
    } catch {
        Write-Error "Client API not accessible: $($_.Exception.Message)"
        $testResults["client_api_health"] = $false
    }

    # Test 2: Tester API Status
    Write-Info "Test 2: Tester API Status"
    try {
        $response = Invoke-RestMethod -Uri "$ApiUrl/api/tester/status" -TimeoutSec 10
        if ($response.success -eq $true) {
            Write-Success "Tester API status check passed"
            Write-Info "  Active connections: $($response.data.sseManager.activeConnections)"
            Write-Info "  Session count: $($response.data.sseManager.sessionCount)"
            $testResults["tester_api_status"] = $true
        } else {
            Write-Error "Tester API status check failed"
            $testResults["tester_api_status"] = $false
        }
    } catch {
        Write-Error "Tester API not accessible: $($_.Exception.Message)"
        $testResults["tester_api_status"] = $false
    }

    # Test 3: CLI Framework Test
    Write-Info "Test 3: CLI Framework Test"
    try {
        $cliResult = & "$rootDir\a2a-client\tester\cli.js" status --api-url $ApiUrl --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "CLI status command executed successfully"
            $testResults["cli_framework"] = $true
        } else {
            Write-Error "CLI status command failed"
            $testResults["cli_framework"] = $false
        }
    } catch {
        Write-Error "CLI framework test failed: $($_.Exception.Message)"
        $testResults["cli_framework"] = $false
    }

    # Test 4: Web UI Basic Availability
    Write-Info "Test 4: Web UI Basic Availability"
    try {
        $response = Invoke-WebRequest -Uri $WebUrl -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Web UI basic check passed"
            $testResults["web_ui_basic"] = $true
        } else {
            Write-Error "Web UI basic check failed: $($response.StatusCode)"
            $testResults["web_ui_basic"] = $false
        }
    } catch {
        Write-Error "Web UI not accessible: $($_.Exception.Message)"
        $testResults["web_ui_basic"] = $false
    }

    # Test 5: CLI-Web Client SSE Communication
    Write-Info "Test 5: CLI-Web Client SSE Communication"
    try {
        # Send ping command via CLI
        $pingResult = & "$rootDir\a2a-client\tester\cli.js" send ping --api-url $ApiUrl --session $SessionId --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "CLI ping command sent successfully"
            $testResults["sse_communication"] = $true
        } else {
            Write-Error "CLI ping command failed"
            $testResults["sse_communication"] = $false
        }
    } catch {
        Write-Error "SSE communication test failed: $($_.Exception.Message)"
        $testResults["sse_communication"] = $false
    }

    # Test 6: Panel Management
    Write-Info "Test 6: Panel Management"
    try {
        # Test panel show command
        $panelResult = & "$rootDir\a2a-client\tester\cli.js" panel show task-panel --api-url $ApiUrl --session $SessionId --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Panel management command executed successfully"
            $testResults["panel_management"] = $true
        } else {
            Write-Error "Panel management command failed"
            $testResults["panel_management"] = $false
        }
    } catch {
        Write-Error "Panel management test failed: $($_.Exception.Message)"
        $testResults["panel_management"] = $false
    }

    # Test 7: Session Management
    Write-Info "Test 7: Session Management"
    try {
        # Test session creation
        $sessionResult = & "$rootDir\a2a-client\tester\cli.js" session create --title "Test Session" --api-url $ApiUrl --session $SessionId --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Session management command executed successfully"
            $testResults["session_management"] = $true
        } else {
            Write-Error "Session management command failed"
            $testResults["session_management"] = $false
        }
    } catch {
        Write-Error "Session management test failed: $($_.Exception.Message)"
        $testResults["session_management"] = $false
    }

    # Test 8: Server Integration
    Write-Info "Test 8: Server Integration"
    try {
        $response = Invoke-WebRequest -Uri "$ServerUrl/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "A2A Server health check passed"
            $testResults["server_integration"] = $true
        } else {
            Write-Error "A2A Server health check failed: $($response.StatusCode)"
            $testResults["server_integration"] = $false
        }
    } catch {
        Write-Error "Server integration test failed: $($_.Exception.Message)"
        $testResults["server_integration"] = $false
    }

    # Test 9: AI Integration Health
    Write-Info "Test 9: AI Integration Health"
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/health" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "AI Integration proxy health check passed"
            $testResults["ai_integration"] = $true
        } else {
            Write-Error "AI Integration proxy health check failed: $($response.StatusCode)"
            $testResults["ai_integration"] = $false
        }
    } catch {
        Write-Error "AI Integration health test failed: $($_.Exception.Message)"
        $testResults["ai_integration"] = $false
    }

    # Test 10: Full E2E Flow Test
    Write-Info "Test 10: Full E2E Flow Test"
    if ($testResults["server_integration"] -and $testResults["ai_integration"]) {
        try {
            # Test a simple request through the full chain
            $testRequest = @{
                message = "Hello from E2E test"
                context = @{}
                sessionId = $SessionId
            } | ConvertTo-Json

            $response = Invoke-RestMethod -Uri "$ServerUrl/api/v1/requests" -Method POST -Body $testRequest -ContentType "application/json" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 30

            if ($response.success -eq $true -and $response.data.promiseId) {
                Write-Success "Full E2E flow test passed - request created with promiseId: $($response.data.promiseId)"
                $testResults["e2e_flow"] = $true

                # Wait a moment and check promise status
                Start-Sleep -Seconds 2
                $statusResponse = Invoke-RestMethod -Uri "$ServerUrl/api/v1/requests/$($response.data.promiseId)/status" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 10
                Write-Info "Promise status: $($statusResponse.data.status)"
            } else {
                Write-Error "Full E2E flow test failed - invalid response"
                $testResults["e2e_flow"] = $false
            }
        } catch {
            Write-Error "Full E2E flow test failed: $($_.Exception.Message)"
            $testResults["e2e_flow"] = $false
        }
    } else {
        Write-Warning "Skipping E2E flow test - server or AI integration not available"
        $testResults["e2e_flow"] = $null
    }

    # Test 11: Automated Test Suites
    Write-Info "Test 11: Automated Test Suites"
    try {
        # Run CLI test suite
        $testResult = & "$rootDir\a2a-client\tester\cli.js" test --suite panels --api-url $ApiUrl --session $SessionId --json 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Automated test suite executed successfully"
            $testResults["automated_tests"] = $true
        } else {
            Write-Error "Automated test suite failed"
            $testResults["automated_tests"] = $false
        }
    } catch {
        Write-Error "Automated test suites failed: $($_.Exception.Message)"
        $testResults["automated_tests"] = $false
    }

    # Summary
    Write-Host ""
    Write-Info "Test Summary"
    Write-Info "============"

    $passedTests = 0
    $failedTests = 0
    $skippedTests = 0

    foreach ($test in $testResults.GetEnumerator()) {
        $status = switch {
            ($test.Value -eq $true) { "PASS"; $passedTests++; break }
            ($test.Value -eq $false) { "FAIL"; $failedTests++; break }
            ($null -eq $test.Value) { "SKIP"; $skippedTests++; break }
        }
        Write-Host ("{0,-25} : {1}" -f $test.Key, $status)
    }

    Write-Host ""
    Write-Info "Results: $passedTests passed, $failedTests failed, $skippedTests skipped"

    if ($failedTests -eq 0) {
        Write-Success "All Level 3 tests completed successfully!"
        exit 0
    } else {
        Write-Error "$failedTests tests failed"
        exit 1
    }

} catch {
    Write-Error "Critical test failure: $($_.Exception.Message)"
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
