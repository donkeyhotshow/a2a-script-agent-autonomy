# Level 1 Runner: Basic Health Checks
# Запуск всех Level 1 тестов с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,
    [switch]$SkipSubLevel  # Зарезервировано для будущего фильтрации подуровней
)

$helper = Join-Path $PSScriptRoot "..\common\run-sequence.ps1"
. $helper

$subLevels = @(
    @{ Name = "1.1 Services"; Path = "1-services\run.ps1"; Description = "Service availability checks" },
    @{ Name = "1.2 Connectivity"; Path = "2-connectivity\run.ps1"; Description = "Network connectivity tests" },
    @{ Name = "1.3 Basic API"; Path = "3-basic-api\run.ps1"; Description = "Basic API endpoint tests" }
)

$result = Invoke-TestSequence `
    -Title "=== LEVEL 1: Basic Health Checks ===" `
    -Description "Testing order: Services -> Connectivity -> Basic API" `
    -Stages $subLevels `
    -BasePath $PSScriptRoot `
    -VerboseOutput:$Verbose `
    -ContinueOnError:$ContinueOnError

Write-Host ""

if (-not $result.HasFailures) {
    Write-Host "PASS: LEVEL 1 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All basic health checks passed. Ready for Level 2 tests." -ForegroundColor Green
    exit 0
}

$failed = $result.FailedStages | ForEach-Object { $_.Name }
Write-Host "WARN: LEVEL 1 COMPLETED WITH ISSUES" -ForegroundColor Yellow
Write-Host "Failed sub-levels: $($failed -join ', ')" -ForegroundColor Yellow
Write-Host "Some basic functionality may not work. Proceed with caution." -ForegroundColor Yellow

if ($ContinueOnError) {
    exit 2
} else {
    exit 1
}
