# Level 2.1: Individual Component Tests
# Тесты отдельных компонентов системы

param(
    [switch]$Verbose,
    [switch]$Quick  # Быстрый режим без долгих операций
)

# Color output functions
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

Write-Info "Level 2.1: Individual Component Tests"
Write-Info "====================================="

$components = @(
    @{
        Name = "A2A Server Core"
        Tests = @(
            @{
                Name = "Health Check"
                Test = {
                    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 10
                    if ($response.StatusCode -ne 200) { throw "Health check failed: $($response.StatusCode)" }
                }
            },
            @{
                Name = "Detailed Health"
                Test = {
                    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -TimeoutSec 10
                    if (-not $response.status) { throw "Detailed health check failed" }
                }
            },
            @{
                Name = "Basic Request Creation"
                Test = {
                    $body = @{
                        message = "test"
                        context = @{}
                        sessionId = "test-session"
                    } | ConvertTo-Json

                    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/requests" -Method POST -Body $body -ContentType "application/json" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 15
                    if (-not $response.success) { throw "Request creation failed: $($response | ConvertTo-Json)" }
                }
            }
        )
    },
    @{
        Name = "Client API"
        Tests = @(
            @{
                Name = "Health Check"
                Test = {
                    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 10
                    if ($response.StatusCode -ne 200) { throw "Health check failed: $($response.StatusCode)" }
                }
            },
            @{
                Name = "Tester API Status"
                Test = {
                    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/tester/status" -TimeoutSec 10
                    if (-not $response.success) { throw "Tester API status failed" }
                }
            }
        )
    },
    @{
        Name = "AI Integration"
        Tests = @(
            @{
                Name = "Proxy Health"
                Test = {
                    $response = Invoke-WebRequest -Uri "http://localhost:11435/health" -TimeoutSec 10
                    if ($response.StatusCode -ne 200) { throw "Proxy health failed: $($response.StatusCode)" }
                }
            },
            @{
                Name = "Daemon Status"
                Test = {
                    $response = Invoke-RestMethod -Uri "http://localhost:11435/daemon/status" -TimeoutSec 10
                    if (-not $response.running) { throw "Daemon not running" }
                }
            },
            @{
                Name = "Ollama Connection"
                Test = {
                    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 10
                    if (-not $response.models -or $response.models.Count -eq 0) { throw "No Ollama models available" }
                }
            }
        )
    }
)

$results = @{}
$allPassed = $true

foreach ($component in $components) {
    Write-Info "Testing component: $($component.Name)"
    $componentResults = @{}

    foreach ($test in $component.Tests) {
        Write-Info "  Running test: $($test.Name)..."

        try {
            & $test.Test
            Write-Success "  $($test.Name) passed"
            $componentResults[$test.Name] = $true
        } catch {
            Write-Error "  $($test.Name) failed: $($_.Exception.Message)"
            $componentResults[$test.Name] = $false
            $allPassed = $false
        }
    }

    $results[$component.Name] = $componentResults
    Write-Host ""
}

# Summary
Write-Info "Individual Component Test Summary:"
foreach ($componentResult in $results.GetEnumerator()) {
    Write-Host ""
    Write-Host "$($componentResult.Key):" -ForegroundColor Cyan

    foreach ($testResult in $componentResult.Value.GetEnumerator()) {
        $status = if ($testResult.Value) { "✓ PASS" } else { "✗ FAIL" }
        Write-Host ("  {0,-25} : {1}" -f $testResult.Key, $status)
    }
}

if ($allPassed) {
    Write-Success "All Level 2.1 individual component tests passed!"
    exit 0
} else {
    Write-Error "Some individual component tests failed. Check component configuration."
    exit 1
}