# Master Test Runner: All Levels
# Запуск всех уровней тестирования с fail-fast логикой

param(
    [switch]$Verbose,
    [switch]$ContinueOnError,  # Продолжить при ошибках (для диагностики)
    [switch]$Level1Only,       # Только Level 1
    [switch]$Level2Only,       # Только Level 2
    [switch]$Level3Only,       # Только Level 3
    [switch]$Quick,            # Быстрый режим (пропустить долгие тесты)
    [switch]$Light             # Облегченный режим (минимальная нагрузка)
)

$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "🧪🧪🧪 A2A SCRIPT AGENT - MASTER TEST SUITE 🧪🧪🧪" -ForegroundColor Magenta
Write-Host "====================================================" -ForegroundColor Magenta
Write-Host "Testing Framework: 3 Levels, Fail-Fast Execution" -ForegroundColor Gray
Write-Host ""

# Определение уровней для запуска
$levelsToRun = @()

if ($Level1Only) {
    $levelsToRun = @("level1")
} elseif ($Level2Only) {
    $levelsToRun = @("level2")
} elseif ($Level3Only) {
    $levelsToRun = @("level3")
} else {
    $levelsToRun = @("level1", "level2", "level3")
}

# Информация о конфигурации
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Levels to run: $($levelsToRun -join ' → ')" -ForegroundColor White
Write-Host "  Verbose mode: $($Verbose)" -ForegroundColor White
Write-Host "  Continue on error: $($ContinueOnError)" -ForegroundColor White
Write-Host "  Quick mode: $($Quick)" -ForegroundColor White
Write-Host "  Light mode: $($Light)" -ForegroundColor White
Write-Host ""

$levelDefinitions = @(
    @{
        Name = "Level 1"
        Path = "level1\run.ps1"
        Description = "Basic health checks (Services, Connectivity, API)"
        Duration = "30 seconds"
    },
    @{
        Name = "Level 2"
        Path = "level2\run.ps1"
        Description = "Component integration (Individual, Interactions, Persistence)"
        Duration = "2-3 minutes"
    },
    @{
        Name = "Level 3"
        Path = "level3\run.ps1"
        Description = "End-to-end workflows (Workflows, CLI, Performance)"
        Duration = "6-16 minutes"
    }
)

$failedLevels = @()
$startTime = Get-Date

foreach ($levelName in $levelsToRun) {
    $levelDef = $levelDefinitions | Where-Object { $_.Name -match $levelName }

    if (-not $levelDef) {
        Write-Host "❌ Unknown level: $levelName" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "▶️  STARTING $($levelDef.Name.ToUpper())" -ForegroundColor Yellow
    Write-Host "  Description: $($levelDef.Description)" -ForegroundColor Gray
    Write-Host "  Estimated duration: $($levelDef.Duration)" -ForegroundColor Gray
    Write-Host ""

    try {
        $scriptPath = Join-Path $PSScriptRoot $levelDef.Path

        $args = @()
        if ($Verbose) { $args += "-Verbose" }
        if ($ContinueOnError) { $args += "-ContinueOnError" }
        if ($Quick) { $args += "-Quick" }
        if ($Light) { $args += "-Light" }

        $levelStartTime = Get-Date
        & $scriptPath @args
        $levelDuration = (Get-Date) - $levelStartTime

        if ($LASTEXITCODE -ne 0) {
            $failedLevels += $levelDef.Name
            if (-not $ContinueOnError) {
                Write-Host ""
                Write-Host "❌ TEST SUITE FAILED at $($levelDef.Name)" -ForegroundColor Red
                Write-Host "Failed levels: $($failedLevels -join ', ')" -ForegroundColor Red
                Write-Host "Total execution time: $((Get-Date) - $startTime)" -ForegroundColor Red
                exit 1
            } else {
                Write-Host "⚠️  $($levelDef.Name) failed but continuing..." -ForegroundColor Yellow
            }
        } else {
            Write-Host "✅ $($levelDef.Name) completed in $($levelDuration.ToString('mm\:ss'))" -ForegroundColor Green
        }

    } catch {
        $failedLevels += $levelDef.Name
        Write-Host "💥 Critical error in $($levelDef.Name): $($_.Exception.Message)" -ForegroundColor Red

        if (-not $ContinueOnError) {
            Write-Host ""
            Write-Host "❌ TEST SUITE CRITICAL FAILURE" -ForegroundColor Red
            Write-Host "Total execution time: $((Get-Date) - $startTime)" -ForegroundColor Red
            exit 1
        }
    }
}

$totalDuration = (Get-Date) - $startTime
Write-Host ""
Write-Host "🏁 TEST SUITE EXECUTION COMPLETED" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Total execution time: $($totalDuration.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host ""

if ($failedLevels.Count -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "System is fully functional and ready for production." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  TESTS COMPLETED WITH ISSUES" -ForegroundColor Yellow
    Write-Host "Failed levels: $($failedLevels -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "- Review failed test output for specific errors" -ForegroundColor White
    Write-Host "- Check service logs for detailed error information" -ForegroundColor White
    Write-Host "- Run individual failed levels with -Verbose flag" -ForegroundColor White
    Write-Host "- Use -ContinueOnError for diagnostic mode" -ForegroundColor White
    exit 2
}