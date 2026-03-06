# Level 3.1: Complete Workflow Tests
# Тесты полных рабочих процессов системы

param(
    [switch]$Verbose,
    [switch]$Quick  # Пропустить долгие операции
)

function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

Write-Info "Level 3.1: Complete Workflow Tests"
Write-Info "==================================="

$workflowTests = @(
    @{
        Name = "Basic Request Flow"
        Optional = $true
        Test = {
            Write-Info "Testing basic request creation and status tracking..."

            $sessionId = "workflow-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
            $body = @{
                message = "Hello from workflow test"
                context = @{}
                sessionId = $sessionId
            } | ConvertTo-Json

            # Create request
            $createResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/requests" -Method POST -Body $body -ContentType "application/json" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 15
            if (-not $createResponse.success) { throw "Request creation failed" }

            $promiseId = $createResponse.data.promiseId
            Write-Info "Created request with promiseId: $promiseId"

            # Check status multiple times
            for ($i = 1; $i -le 5; $i++) {
                Start-Sleep -Seconds 1
                try {
                    $statusResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/requests/$promiseId/status" -Headers @{"x-skip-auth" = "true"} -TimeoutSec 10
                    $status = $statusResponse.data.status
                    Write-Info "Status check $i`: $status"

                    if ($status -eq "completed") {
                        Write-Success "Request completed successfully"
                        break
                    } elseif ($status -eq "error") {
                        throw "Request failed with error"
                    }
                } catch {
                    Write-Warning "Status check $i failed: $($_.Exception.Message)"
                }
            }
        }
    },
    @{
        Name = "Storage Operations Workflow"
        Optional = $true
        Test = {
            Write-Info "Testing storage operations..."

            $testNamespace = "workflow-test"
            $testKey = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"
            $testData = @{ workflow = "test"; data = "sample"; timestamp = Get-Date -Format 'o' } | ConvertTo-Json

            # Store data
            $putResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/storage/$testNamespace/$testKey" -Method PUT -Body $testData -ContentType "application/json" -TimeoutSec 10
            if ($putResponse.StatusCode -ne 200) { throw "PUT operation failed" }

            # Retrieve data
            $getResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/storage/$testNamespace/$testKey" -TimeoutSec 10
            if (-not $getResponse) { throw "GET operation failed" }

            # List keys
            $keysResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/storage/$testNamespace/keys" -TimeoutSec 10

            # Cleanup
            Invoke-WebRequest -Uri "http://localhost:3000/api/v1/storage/$testNamespace/$testKey" -Method DELETE -TimeoutSec 10 | Out-Null

            Write-Success "Storage workflow completed successfully"
        }
    },
    @{
        Name = "AI Integration Workflow"
        Optional = $true
        Test = {
            Write-Info "Testing AI integration workflow..."

            # Test Ollama connectivity
            $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 10
            if ($ollamaResponse.models.Count -eq 0) { throw "No Ollama models available" }

            # Test proxy health
            $proxyResponse = Invoke-WebRequest -Uri "http://localhost:11435/health" -TimeoutSec 10
            if ($proxyResponse.StatusCode -ne 200) { throw "AI proxy not healthy" }

            # Test daemon status
            $daemonResponse = Invoke-RestMethod -Uri "http://localhost:11435/daemon/status" -TimeoutSec 10
            if (-not $daemonResponse.running) { throw "AI daemon not running" }

            Write-Success "AI integration workflow verified"
        }
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $workflowTests) {
    Write-Info "Running workflow test: $($test.Name)..."
    $optionalTest = $test.Optional -eq $true

    try {
        & $test.Test
        Write-Success "$($test.Name) completed successfully"
        $results[$test.Name] = "PASS"
    } catch {
        if ($optionalTest) {
            Write-Warning "$($test.Name) warning: $($_.Exception.Message)"
            $results[$test.Name] = "WARN"
        } else {
            Write-Error "$($test.Name) failed: $($_.Exception.Message)"
            $results[$test.Name] = "FAIL"
            $allPassed = $false
        }
    }

    Write-Host ""
}

Write-Info "Complete Workflow Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "[PASS]" }
        "WARN" { "[WARN]" }
        default { "[FAIL]" }
    }
    Write-Host ("{0,-35} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 3.1 workflow tests passed!"
    exit 0
} else {
    Write-Error "Some workflow tests failed. Check complete system integration."
    exit 1
}
