# Level 2 Runner: Component Integration Tests
# Запуск всех Level 2 тестов с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError
)

$helper = Join-Path $PSScriptRoot "..\common\run-sequence.ps1"
. $helper

$subLevels = @(
    @{ Name = "2.1 Individual"; Path = "1-individual\run.ps1"; Description = "Individual component tests" },
    @{ Name = "2.2 Interactions"; Path = "2-interaction\run.ps1"; Description = "Component interaction tests" },
    @{ Name = "2.3 Persistence"; Path = "3-persistence\run.ps1"; Description = "Data persistence tests" }
)

$result = Invoke-TestSequence `
    -Title "=== LEVEL 2: Component Integration Tests ===" `
    -Description "Testing order: Individual -> Interactions -> Persistence" `
    -Stages $subLevels `
    -BasePath $PSScriptRoot `
    -VerboseOutput:$Verbose `
    -ContinueOnError:$ContinueOnError

Write-Host ""

if (-not $result.HasFailures) {
    Write-Host "PASS: LEVEL 2 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All component integration tests passed. Ready for Level 3 tests." -ForegroundColor Green
    exit 0
}

$failed = $result.FailedStages | ForEach-Object { $_.Name }
Write-Host "WARN: LEVEL 2 COMPLETED WITH ISSUES" -ForegroundColor Yellow
Write-Host "Failed sub-levels: $($failed -join ', ')" -ForegroundColor Yellow
Write-Host "Some integration functionality may not work. Proceed with caution." -ForegroundColor Yellow

if ($ContinueOnError) {
    exit 2
} else {
    exit 1
}
