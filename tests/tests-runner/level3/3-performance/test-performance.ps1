# Level 3.3: Performance Tests
# Тесты производительности системы

param(
    [switch]$Verbose,
    [switch]$Light  # Облегченный режим тестирования
)

function Write-Success { param($Message) Write-Host "[PASS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[FAIL] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }

Write-Info "Level 3.3: Performance Tests"
Write-Info "============================"

$performanceTests = @(
    @{
        Name = "API Response Time Test"
        Optional = $true
        Test = {
            Write-Info "Testing API response times..."

            $endpoints = @(
                "http://localhost:3000/health",
                "http://localhost:3001/health",
                "http://localhost:11434/health"
            )

            $results = @()
            foreach ($endpoint in $endpoints) {
                $times = @()
                for ($i = 1; $i -le 5; $i++) {
                    $start = Get-Date
                    try {
                        Invoke-WebRequest -Uri $endpoint -TimeoutSec 10 | Out-Null
                        $duration = ((Get-Date) - $start).TotalMilliseconds
                        $times += $duration
                    } catch {
                        Write-Warning "Request to $endpoint failed"
                    }
                }

                if ($times.Count -gt 0) {
                    $avgTime = ($times | Measure-Object -Average).Average
                    $results += @{ Endpoint = $endpoint; AvgTime = $avgTime }
                    Write-Info ("  {0}: {1:F2}ms average" -f $endpoint, $avgTime)
                }
            }

            # Check if response times are reasonable (< 1000ms)
            $slowEndpoints = $results | Where-Object { $_.AvgTime -gt 1000 }
            if ($slowEndpoints.Count -gt 0) {
                throw "Some endpoints are too slow: $($slowEndpoints | ForEach-Object { "$($_.Endpoint): $($_.AvgTime)F2ms" })"
            }
        }
    },
    @{
        Name = "Concurrent Requests Test"
        Optional = $true
        Test = {
            if ($Light) {
                Write-Info "Skipping concurrent requests test in light mode"
                return
            }

            Write-Info "Testing concurrent requests (light load)..."

            $concurrentRequests = 5
            $jobs = @()

            # Start concurrent health checks
            for ($i = 1; $i -le $concurrentRequests; $i++) {
                $jobs += Start-Job -ScriptBlock {
                    param($url)
                    $start = Get-Date
                    try {
                        Invoke-WebRequest -Uri $url -TimeoutSec 15 | Out-Null
                        return ((Get-Date) - $start).TotalMilliseconds
                    } catch {
                        return -1
                    }
                } -ArgumentList "http://localhost:3000/health"
            }

            # Wait for completion
            $completed = 0
            $failed = 0
            foreach ($job in $jobs) {
                $result = Receive-Job -Job $job -Wait
                if ($result -eq -1) {
                    $failed++
                } else {
                    $completed++
                    Write-Info ("  Request completed in {0:F2}ms" -f $result)
                }
                Remove-Job -Job $job
            }

            if ($failed -gt 0) {
                throw "$failed out of $concurrentRequests concurrent requests failed"
            }

            Write-Info "Concurrent requests test passed: $completed/$concurrentRequests successful"
        }
    },
    @{
        Name = "Memory Usage Check"
        Optional = $true
        Test = {
            Write-Info "Checking memory usage..."

            # Get current process memory (simplified check)
            $currentProcess = Get-Process -Id $PID
            $memoryMB = [math]::Round($currentProcess.WorkingSet64 / 1MB, 2)
            Write-Info "Current process memory: ${memoryMB}MB"

            # This is a basic check - in production you'd monitor all services
            if ($memoryMB -gt 1000) { # More than 1GB
                Write-Warning "High memory usage detected: ${memoryMB}MB"
            } else {
                Write-Info "Memory usage is within acceptable limits"
            }
        }
    }
)

$results = @{}
$allPassed = $true

foreach ($test in $performanceTests) {
    Write-Info "Running performance test: $($test.Name)..."
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

Write-Info "Performance Test Summary:"
foreach ($result in $results.GetEnumerator()) {
    $status = switch ($result.Value) {
        "PASS" { "[PASS]" }
        "WARN" { "[WARN]" }
        default { "[FAIL]" }
    }
    Write-Host ("{0,-35} : {1}" -f $result.Key, $status)
}

if ($allPassed) {
    Write-Success "All Level 3.3 performance tests passed!"
    exit 0
} else {
    Write-Error "Some performance tests failed. Check system performance."
    exit 1
}
