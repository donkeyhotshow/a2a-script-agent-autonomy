# Level 3 Runner: End-to-End Integration Tests
# Запуск всех Level 3 тестов с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,
    [switch]$Light,
    [switch]$Quick
)

$helper = Join-Path $PSScriptRoot "..\common\run-sequence.ps1"
. $helper

$subLevels = @(
    @{ Name = "3.1 Workflows"; Path = "1-workflow\run.ps1"; Description = "Complete workflow integration"; InheritFlags = @("Quick") },
    @{ Name = "3.2 CLI"; Path = "2-cli\run.ps1"; Description = "CLI automation and control" },
    @{ Name = "3.3 Performance"; Path = "3-performance\run.ps1"; Description = "Performance and load testing"; InheritFlags = @("Light") }
)

$result = Invoke-TestSequence `
    -Title "=== LEVEL 3: End-to-End Integration Tests ===" `
    -Description "Testing order: Workflows -> CLI Automation -> Performance" `
    -Stages $subLevels `
    -BasePath $PSScriptRoot `
    -VerboseOutput:$Verbose `
    -ContinueOnError:$ContinueOnError `
    -Quick:$Quick `
    -Light:$Light

Write-Host ""

if (-not $result.HasFailures) {
    Write-Host "PASS: LEVEL 3 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All end-to-end integration tests passed. System is fully functional!" -ForegroundColor Green
    exit 0
}

$failed = $result.FailedStages | ForEach-Object { $_.Name }
Write-Host "WARN: LEVEL 3 COMPLETED WITH ISSUES" -ForegroundColor Yellow
Write-Host "Failed sub-levels: $($failed -join ', ')" -ForegroundColor Yellow
Write-Host "Some advanced functionality may not work. Review and fix issues." -ForegroundColor Yellow

if ($ContinueOnError) {
    exit 2
} else {
    exit 1
}
