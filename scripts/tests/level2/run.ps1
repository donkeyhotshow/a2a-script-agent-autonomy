# Level 2 Runner: Component Integration Tests
param([switch]$Verbose,[switch]$ContinueOnError)
$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀🚀🚀 LEVEL 2: Component Integration Tests 🚀🚀🚀" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Testing order: Individual → Interactions → Persistence" -ForegroundColor Gray
Write-Host ""

$subLevels = @(
    @{ Name = "2.1 Individual"; Path = "1-individual\run.ps1"; Description = "Individual component tests" },
    @{ Name = "2.2 Interactions"; Path = "2-interaction\run.ps1"; Description = "Component interaction tests" },
    @{ Name = "2.3 Persistence"; Path = "3-persistence\run.ps1"; Description = "Data persistence tests" }
)

$failedLevels = @()

foreach ($subLevel in $subLevels) {
    Write-Host ""
    Write-Host "Running $($subLevel.Name): $($subLevel.Description)" -ForegroundColor Yellow

    try {
        $scriptPath = Join-Path $PSScriptRoot $subLevel.Path

        if ($Verbose) {
            & $scriptPath -Verbose
        } elseif ($ContinueOnError) {
            & $scriptPath -ContinueOnError
        } else {
            & $scriptPath
        }

        if ($LASTEXITCODE -ne 0) {
            $failedLevels += $subLevel.Name
            if (-not $ContinueOnError) {
                Write-Host ""
                Write-Host "❌ LEVEL 2 FAILED at $($subLevel.Name)" -ForegroundColor Red
                Write-Host "Failed sub-levels: $($failedLevels -join ', ')" -ForegroundColor Red
                exit 1
            } else {
                Write-Host "⚠️  $($subLevel.Name) failed but continuing..." -ForegroundColor Yellow
            }
        }

    } catch {
        $failedLevels += $subLevel.Name
        Write-Host "💥 Critical error in $($subLevel.Name): $($_.Exception.Message)" -ForegroundColor Red

        if (-not $ContinueOnError) {
            Write-Host ""
            Write-Host "❌ LEVEL 2 CRITICAL FAILURE" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
if ($failedLevels.Count -eq 0) {
    Write-Host "🎉 LEVEL 2 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All component integration tests passed. Ready for Level 3 tests." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  LEVEL 2 COMPLETED WITH ISSUES" -ForegroundColor Yellow
    Write-Host "Failed sub-levels: $($failedLevels -join ', ')" -ForegroundColor Yellow
    Write-Host "Some integration functionality may not work. Proceed with caution." -ForegroundColor Yellow
    exit 2
}