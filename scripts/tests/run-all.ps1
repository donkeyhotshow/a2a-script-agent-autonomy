# Master Test Runner: All Levels
# Запуск всех уровней тестирования с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,
    [switch]$Level1Only,
    [switch]$Level2Only,
    [switch]$Level3Only,
    [switch]$Quick,
    [switch]$Light
)

$helper = Join-Path $PSScriptRoot "common\run-sequence.ps1"
. $helper

$levelsToRun = @()
if ($Level1Only) {
    $levelsToRun = @("Level 1")
} elseif ($Level2Only) {
    $levelsToRun = @("Level 2")
} elseif ($Level3Only) {
    $levelsToRun = @("Level 3")
} else {
    $levelsToRun = @("Level 1", "Level 2", "Level 3")
}

Write-Host "=== A2A SCRIPT AGENT - MASTER TEST SUITE ===" -ForegroundColor Magenta
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "Testing Framework: 3 Levels, Fail-Fast Execution" -ForegroundColor Gray
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Levels to run: $($levelsToRun -join ' -> ')" -ForegroundColor White
Write-Host "  Verbose mode: $($Verbose)" -ForegroundColor White
Write-Host "  Continue on error: $($ContinueOnError)" -ForegroundColor White
Write-Host "  Quick mode: $($Quick)" -ForegroundColor White
Write-Host "  Light mode: $($Light)" -ForegroundColor White
Write-Host ""

$levelDefinitions = @(
    @{
        Name = "Level 1"
        Path = "level1\run.ps1"
        Description = "Basic health checks (Services, Connectivity, API) - ~30 seconds"
    },
    @{
        Name = "Level 2"
        Path = "level2\run.ps1"
        Description = "Component integration (Individual, Interactions, Persistence) - 2-3 minutes"
    },
    @{
        Name = "Level 3"
        Path = "level3\run.ps1"
        Description = "End-to-end workflows (Workflows, CLI, Performance) - 6-16 minutes"
        InheritFlags = @("Quick", "Light")
    }
)

$selectedLevels = $levelDefinitions | Where-Object { $levelsToRun -contains $_.Name }

$startTime = Get-Date
$result = Invoke-TestSequence `
    -Title "=== A2A SCRIPT AGENT - MASTER TEST SUITE ===" `
    -Description "The full stack validation pipeline (Level 1 -> Level 2 -> Level 3)" `
    -Stages $selectedLevels `
    -BasePath $PSScriptRoot `
    -VerboseOutput:$Verbose `
    -ContinueOnError:$ContinueOnError `
    -Quick:$Quick `
    -Light:$Light

$totalDuration = (Get-Date) - $startTime
Write-Host ""
Write-Host "=== TEST SUITE EXECUTION COMPLETED ===" -ForegroundColor Cyan
$minutes = [math]::Floor($totalDuration.TotalMinutes)
$seconds = $totalDuration.Seconds
Write-Host "Total execution time: ${minutes}m ${seconds}s" -ForegroundColor White

if (-not $result.HasFailures) {
    Write-Host "PASS: ALL TESTS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "System is fully functional and ready for production." -ForegroundColor Green
    exit 0
}

$failed = $result.FailedStages | ForEach-Object { $_.Name }
if ($ContinueOnError) {
    Write-Host "WARN: TESTS COMPLETED WITH ISSUES" -ForegroundColor Yellow
    Write-Host "Failed levels: $($failed -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "- Review failed test output for specific errors" -ForegroundColor White
    Write-Host "- Check service logs for detailed error information" -ForegroundColor White
    Write-Host "- Run individual failed levels with -Verbose flag" -ForegroundColor White
    Write-Host "- Use -ContinueOnError for diagnostic mode" -ForegroundColor White
    exit 2
} else {
    Write-Host "FAIL: TEST SUITE FAILED" -ForegroundColor Red
    Write-Host "Failed levels: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}
