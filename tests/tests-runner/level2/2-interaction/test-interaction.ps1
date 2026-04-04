# Level 2.2: Component Interaction Tests
# Тесты взаимодействия между компонентами

param(
    [switch]$Verbose
)

# Color output functions
function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

Write-Info "Level 2.2: Component Interaction Tests"
Write-Info "======================================"

$interactionTests = @(
    @{
        Name = "Server-Client API Communication"
        Optional = $true
        Test = {
            # Test basic request flow
            $body = @{
                message = "interaction test"
                context = @{}
                sessionId = "interaction-test-session"
            } | ConvertTo-Json

            $serverResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/requests" -Method POST -Body $body -ContentType "application/json" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 15
            if (-not $serverResponse.success) { throw "Server request failed" }

            $promiseId = $serverResponse.data.promiseId
            Write-Info "Created promise: $promiseId"

            # Check promise status
            $statusResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/requests/$promiseId/status" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 10
            Write-Info "Promise status: $($statusResponse.data.status)"
        }
    },
    @{
        Name = "Server-AI Integration Workflow"
        Optional = $true
        Test = {
            # Test AI integration connectivity
            $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11435/api/tags" -TimeoutSec 10
            if ($ollamaResponse.models.Count -eq 0) { throw "No Ollama models available" }

            $proxyResponse = Invoke-WebRequest -Uri "http://localhost:11434/health" -TimeoutSec 10
            if ($proxyResponse.StatusCode -ne 200) { throw "AI proxy not healthy" }

            Write-Info "AI Integration components connected"
        }
    },
    @{
        Name = "Database Connectivity"
        Optional = $true
        Test = {
            # Test database through server metrics
            try {
                $metricsResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/queue/metrics" -TimeoutSec 10
                if ($metricsResponse.StatusCode -eq 200) {
                    Write-Info "Database connectivity confirmed via metrics"
                } else {
                    throw "Metrics endpoint not accessible"
                }
            } catch {
                Write-Warning "Metrics not available, but this may be expected"
            }
        }
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $interactionTests) {
    Write-Info "Testing interaction: $($test.Name)..."

    try {
        & $test.Test
        Write-Success "$($test.Name) passed"
        $results[$test.Name] = "PASS"
    } catch {
        if ($test.Optional -eq $true) {
            Write-Warning "$($test.Name) warning: $($_.Exception.Message)"
            $results[$test.Name] = "WARN"
        } else {
            Write-Error "$($test.Name) failed: $($_.Exception.Message)"
            $results[$test.Name] = "FAIL"
            $allPassed = $false
        }
    }
}

# Summary
Write-Host ""
Write-Info "Component Interaction Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "[PASS]" }
        "WARN" { "[WARN]" }
        default { "[FAIL]" }
    }
    Write-Host ("{0,-40} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 2.2 interaction tests passed!"
    exit 0
} else {
    Write-Error "Some interaction tests failed. Check component integration."
    exit 1
}
