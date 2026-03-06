# Web UI Smoke Test Report Generator
# Generates summary reports from test logs

param(
    [string]$LogDir = "$PSScriptRoot\..\a2a-client\tests\logs\web-ui-smoke",
    [int]$DaysBack = 7,
    [switch]$Detailed
)

$logDirPath = Resolve-Path $LogDir -ErrorAction SilentlyContinue
if (-not $logDirPath) {
    Write-Error "Log directory not found: $LogDir"
    exit 1
}

Write-Host "Web UI Smoke Test Report" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Log Directory: $logDirPath"
Write-Host "Reporting Period: Last $DaysBack days"
Write-Host ""

# Get test result files
$cutoffDate = (Get-Date).AddDays(-$DaysBack)
$resultFiles = Get-ChildItem $logDirPath -Filter "web-ui-smoke-enhanced-*.json" |
    Where-Object { $_.LastWriteTime -gt $cutoffDate } |
    Sort-Object LastWriteTime -Descending

if ($resultFiles.Count -eq 0) {
    Write-Warning "No test results found in the last $DaysBack days"
    exit 0
}

# Analyze results
$passed = 0
$failed = 0
$totalDuration = 0
$serviceHealth = @{
    server = 0
    clientApi = 0
    webUi = 0
    docker = 0
}

$failureReasons = @{}
$testDurations = @()

foreach ($file in $resultFiles) {
    try {
        $content = Get-Content $file.FullName -Raw | ConvertFrom-Json

        if ($content.status -eq 'passed') { $passed++ } else { $failed++ }
        $totalDuration += $content.duration

        # Track service health
        foreach ($result in $content.results) {
            if ($result.services) {
                foreach ($service in $serviceHealth.Keys) {
                    if ($result.services.$service) {
                        $serviceHealth[$service]++
                    }
                }
            }

            # Track failure reasons
            if ($result.status -eq 'failed' -and $result.error) {
                $reason = $result.error -replace '[^a-zA-Z0-9\s]', '' -replace '\s+', ' '
                if ($failureReasons.ContainsKey($reason)) {
                    $failureReasons[$reason]++
                } else {
                    $failureReasons[$reason] = 1
                }
            }
        }

        $testDurations += $content.duration
    } catch {
        Write-Warning "Failed to parse $($file.Name): $($_.Exception.Message)"
    }
}

# Calculate statistics
$totalTests = $passed + $failed
$successRate = if ($totalTests -gt 0) { [math]::Round(($passed / $totalTests) * 100, 1) } else { 0 }
$avgDuration = if ($testDurations.Count -gt 0) { [math]::Round(($testDurations | Measure-Object -Average).Average / 1000, 1) } else { 0 }

# Display summary
Write-Host "SUMMARY" -ForegroundColor Yellow
Write-Host "-------"
Write-Host "Total test runs: $totalTests"
Write-Host "Passed: $passed ($successRate%)" -ForegroundColor $(if ($successRate -ge 95) { 'Green' } elseif ($successRate -ge 80) { 'Yellow' } else { 'Red' })
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
Write-Host "Average duration: ${avgDuration}s"
Write-Host ""

# Service health
Write-Host "SERVICE HEALTH" -ForegroundColor Yellow
Write-Host "--------------"
foreach ($service in $serviceHealth.Keys) {
    $healthy = $serviceHealth[$service]
    $percentage = if ($totalTests -gt 0) { [math]::Round(($healthy / $totalTests) * 100, 1) } else { 0 }
    $color = if ($percentage -ge 95) { 'Green' } elseif ($percentage -ge 80) { 'Yellow' } else { 'Red' }
    Write-Host "$service`: $healthy/$totalTests ($percentage%)" -ForegroundColor $color
}
Write-Host ""

# Top failure reasons
if ($failureReasons.Count -gt 0) {
    Write-Host "TOP FAILURE REASONS" -ForegroundColor Yellow
    Write-Host "-------------------"
    $failureReasons.GetEnumerator() |
        Sort-Object Value -Descending |
        Select-Object -First 5 |
        ForEach-Object {
            Write-Host "$($_.Value) occurrences: $($_.Key)" -ForegroundColor Red
        }
    Write-Host ""
}

# Recent test history
if ($Detailed) {
    Write-Host "RECENT TEST HISTORY" -ForegroundColor Yellow
    Write-Host "-------------------"
    $resultFiles | Select-Object -First 10 | ForEach-Object {
        try {
            $content = Get-Content $_.FullName -Raw | ConvertFrom-Json
            $status = if ($content.status -eq 'passed') { 'PASS' } else { 'FAIL' }
            $color = if ($content.status -eq 'passed') { 'Green' } else { 'Red' }
            $duration = [math]::Round($content.duration / 1000, 1)
            Write-Host "$($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) - $status (${duration}s)" -ForegroundColor $color
        } catch {
            Write-Host "$($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) - ERROR parsing" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Recommendations
Write-Host "RECOMMENDATIONS" -ForegroundColor Yellow
Write-Host "---------------"
if ($successRate -lt 95) {
    Write-Host "⚠️  Low success rate detected - investigate infrastructure stability" -ForegroundColor Red
}
if ($failed -gt 0) {
    Write-Host "⚠️  Recent test failures - check failure reasons above" -ForegroundColor Red
}
if ($avgDuration -gt 60) {
    Write-Host "⚠️  Tests are running slowly - consider infrastructure optimization" -ForegroundColor Yellow
}

$unhealthyServices = $serviceHealth.GetEnumerator() | Where-Object {
    $percentage = if ($totalTests -gt 0) { ($_.Value / $totalTests) * 100 } else { 0 }
    $percentage -lt 95
}
if ($unhealthyServices.Count -gt 0) {
    Write-Host "⚠️  Service health issues detected - check Docker and service configurations" -ForegroundColor Yellow
}

if ($successRate -ge 95 -and $unhealthyServices.Count -eq 0) {
    Write-Host "✅ All systems healthy - Web UI smoke tests passing reliably" -ForegroundColor Green
}

Write-Host ""
Write-Host "Report generated: $(Get-Date)"