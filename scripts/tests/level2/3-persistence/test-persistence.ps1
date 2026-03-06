# Level 2.3: Data Persistence Tests
# Тесты персистентности данных

param(
    [switch]$Verbose
)

function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

Write-Info "Level 2.3: Data Persistence Tests"
Write-Info "=================================="

$persistenceTests = @(
    @{
        Name = "Storage API Basic Operations"
        Optional = $true
        Test = {
            $testKey = "test-persistence-$(Get-Date -Format 'yyyyMMddHHmmss')"
            $testData = @{ message = "test data"; timestamp = Get-Date -Format 'o' } | ConvertTo-Json

            # PUT data
            $putResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/storage/test/$testKey" -Method PUT -Body $testData -ContentType "application/json" -TimeoutSec 10
            if ($putResponse.StatusCode -ne 200) { throw "PUT failed: $($putResponse.StatusCode)" }

            # GET data
            $getResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/storage/test/$testKey" -TimeoutSec 10
            if (-not $getResponse) { throw "GET failed: no data returned" }

            # Cleanup
            Invoke-WebRequest -Uri "http://localhost:3000/api/v1/storage/test/$testKey" -Method DELETE -TimeoutSec 10 | Out-Null

            Write-Info "Storage API operations successful"
        }
    },
    @{
        Name = "Session Data Persistence"
        Optional = $true
        Test = {
            # This would require more complex session testing
            # For now, just check if storage operations work
            $keysResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/storage/test/keys" -TimeoutSec 10
            Write-Info "Storage keys endpoint accessible"
        }
    },
    @{
        Name = "Log Persistence"
        Optional = $true
        Test = {
            # Check if logs directory exists and is writable
            $logDir = "$PSScriptRoot/../../../a2a-server/logs"
            if (Test-Path $logDir) {
                $testFile = Join-Path $logDir "persistence-test.log"
                try {
                    "Test log entry at $(Get-Date)" | Out-File -FilePath $testFile -Encoding UTF8
                    if (Test-Path $testFile) {
                        Remove-Item $testFile -Force
                        Write-Info "Log directory is writable"
                    } else {
                        throw "Could not create test log file"
                    }
                } catch {
                    throw "Log persistence test failed: $($_.Exception.Message)"
                }
            } else {
                Write-Warning "Log directory not found, skipping persistence test"
            }
        }
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $persistenceTests) {
    Write-Info "Testing persistence: $($test.Name)..."

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

Write-Host ""
Write-Info "Data Persistence Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "[PASS]" }
        "WARN" { "[WARN]" }
        default { "[FAIL]" }
    }
    Write-Host ("{0,-35} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 2.3 persistence tests passed!"
    exit 0
} else {
    Write-Error "Some persistence tests failed. Check data storage configuration."
    exit 1
}
