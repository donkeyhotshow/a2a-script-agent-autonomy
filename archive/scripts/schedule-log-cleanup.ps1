# Scheduled Web UI Smoke Test Log Cleanup
# Intended to run as a scheduled task or CI job

param(
    [switch]$DryRun,
    [int]$TestResultsRetention = 50,
    [int]$LogRetentionDays = 30,
    [int]$AnalysisRetention = 10
)

$logDir = "$PSScriptRoot\..\a2a-client\tests\logs\web-ui-smoke"
$archiveDir = "$logDir\archive"

if (-not (Test-Path $logDir)) {
    Write-Error "Log directory not found: $logDir"
    exit 1
}

if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
}

Write-Host "Web UI Smoke Test Log Cleanup" -ForegroundColor Cyan
Write-Host "=============================="
Write-Host "Log Directory: $logDir"
Write-Host "Archive Directory: $archiveDir"
if ($DryRun) { Write-Host "DRY RUN MODE - No files will be moved" -ForegroundColor Yellow }
Write-Host ""

# Get all log files
$allFiles = Get-ChildItem $logDir -File
$filesByType = @{
    TestResults = $allFiles | Where-Object { $_.Name -like 'web-ui-smoke-enhanced-*.json' }
    SSELogs = $allFiles | Where-Object { $_.Name -like 'sse-heartbeat-*.log' }
    InfraLogs = $allFiles | Where-Object { $_.Name -like 'infrastructure-*.log' }
    AnalysisReports = $allFiles | Where-Object { $_.Name -like 'analysis-report-*.json' }
    CleanupReports = $allFiles | Where-Object { $_.Name -like 'cleanup-report-*.json' }
}

Write-Host "Files before cleanup:" -ForegroundColor Yellow
$filesByType.GetEnumerator() | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value.Count) files"
}
Write-Host ""

$archivedCount = 0
$cutoffDate = (Get-Date).AddDays(-$LogRetentionDays)

# Cleanup test results (keep most recent N)
$testResults = $filesByType.TestResults | Sort-Object LastWriteTime -Descending
if ($testResults.Count -gt $TestResultsRetention) {
    $toArchive = $testResults | Select-Object -Skip $TestResultsRetention
    Write-Host "Archiving $($toArchive.Count) old test results..."
    foreach ($file in $toArchive) {
        $reason = "test-results-retention"
        $archiveName = "archive-$(Get-Date -Format 'yyyyMMdd_HHmmss')-$reason-$($file.Name)"
        $archivePath = Join-Path $archiveDir $archiveName

        if ($DryRun) {
            Write-Host "  Would archive: $($file.Name) -> $archiveName"
        } else {
            Move-Item $file.FullName $archivePath
            Write-Host "  Archived: $($file.Name)" -ForegroundColor Green
        }
        $archivedCount++
    }
}

# Cleanup time-based logs
$timeBasedTypes = @(
    @{ Name = 'SSE Logs'; Files = $filesByType.SSELogs; Retention = $LogRetentionDays },
    @{ Name = 'Infrastructure Logs'; Files = $filesByType.InfraLogs; Retention = $LogRetentionDays },
    @{ Name = 'Cleanup Reports'; Files = $filesByType.CleanupReports; Retention = $LogRetentionDays }
)

foreach ($type in $timeBasedTypes) {
    $oldFiles = $type.Files | Where-Object { $_.LastWriteTime -lt $cutoffDate }
    if ($oldFiles.Count -gt 0) {
        Write-Host "Archiving $($oldFiles.Count) old $($type.Name.ToLower())..."
        foreach ($file in $oldFiles) {
            $reason = "$($type.Name.ToLower().Replace(' ', '-'))-age"
            $archiveName = "archive-$(Get-Date -Format 'yyyyMMdd_HHmmss')-$reason-$($file.Name)"
            $archivePath = Join-Path $archiveDir $archiveName

            if ($DryRun) {
                Write-Host "  Would archive: $($file.Name) -> $archiveName"
            } else {
                Move-Item $file.FullName $archivePath
                Write-Host "  Archived: $($file.Name)" -ForegroundColor Green
            }
            $archivedCount++
        }
    }
}

# Cleanup analysis reports (keep most recent N)
$analysisReports = $filesByType.AnalysisReports | Sort-Object LastWriteTime -Descending
if ($analysisReports.Count -gt $AnalysisRetention) {
    $toArchive = $analysisReports | Select-Object -Skip $AnalysisRetention
    Write-Host "Archiving $($toArchive.Count) old analysis reports..."
    foreach ($file in $toArchive) {
        $reason = "analysis-retention"
        $archiveName = "archive-$(Get-Date -Format 'yyyyMMdd_HHmmss')-$reason-$($file.Name)"
        $archivePath = Join-Path $archiveDir $archiveName

        if ($DryRun) {
            Write-Host "  Would archive: $($file.Name) -> $archiveName"
        } else {
            Move-Item $file.FullName $archivePath
            Write-Host "  Archived: $($file.Name)" -ForegroundColor Green
        }
        $archivedCount++
    }
}

# Generate cleanup report
$cleanupReport = @{
    cleanupRun = Get-Date -Format 'o'
    dryRun = $DryRun
    retention = @{
        testResults = $TestResultsRetention
        logRetentionDays = $LogRetentionDays
        analysisReports = $AnalysisRetention
    }
    before = $filesByType.GetEnumerator() | ForEach-Object { @{ $_.Key = $_.Value.Count } }
    archived = $archivedCount
}

$reportPath = Join-Path $logDir "cleanup-report-$(Get-Date -Format 'yyyyMMddHHmmss').json"
$cleanupReport | ConvertTo-Json | Out-File $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Cleanup Summary:" -ForegroundColor Yellow
Write-Host "  Files archived: $archivedCount"
Write-Host "  Report saved: $(Split-Path $reportPath -Leaf)"
Write-Host ""

if ($DryRun) {
    Write-Host "This was a dry run. Use without -DryRun to perform actual cleanup." -ForegroundColor Cyan
} else {
    Write-Host "Cleanup completed successfully." -ForegroundColor Green
}