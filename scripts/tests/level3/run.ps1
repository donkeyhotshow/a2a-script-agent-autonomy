# Level 3 Runner: End-to-End Integration Tests
param([switch]$Verbose,[switch]$ContinueOnError,[switch]$Light,[switch]$Quick)
$rootDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

Write-Host "🚀🚀🚀 LEVEL 3: End-to-End Integration Tests 🚀🚀🚀" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Testing order: Workflows → CLI Automation → Performance" -ForegroundColor Gray
Write-Host ""

$subLevels = @(
    @{ Name = "3.1 Workflows"; Path = "1-workflow\run.ps1"; Description = "Complete workflow integration" },
    @{ Name = "3.2 CLI"; Path = "2-cli\run.ps1"; Description = "CLI automation and control" },
    @{ Name = "3.3 Performance"; Path = "3-performance\run.ps1"; Description = "Performance and load testing" }
)

$failedLevels = @()

foreach ($subLevel in $subLevels) {
    Write-Host ""
    Write-Host "Running $($subLevel.Name): $($subLevel.Description)" -ForegroundColor Yellow

    try {
        $scriptPath = Join-Path $PSScriptRoot $subLevel.Path

        $args = @()
        if ($Verbose) { $args += "-Verbose" }
        if ($ContinueOnError) { $args += "-ContinueOnError" }
        if ($Light -and $subLevel.Name -eq "3.3 Performance") { $args += "-Light" }
        if ($Quick -and $subLevel.Name -eq "3.1 Workflows") { $args += "-Quick" }

        & $scriptPath @args

        if ($LASTEXITCODE -ne 0) {
            $failedLevels += $subLevel.Name
            if (-not $ContinueOnError) {
                Write-Host ""
                Write-Host "❌ LEVEL 3 FAILED at $($subLevel.Name)" -ForegroundColor Red
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
            Write-Host "❌ LEVEL 3 CRITICAL FAILURE" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
if ($failedLevels.Count -eq 0) {
    Write-Host "🎉 LEVEL 3 COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "All end-to-end integration tests passed. System is fully functional!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  LEVEL 3 COMPLETED WITH ISSUES" -ForegroundColor Yellow
    Write-Host "Failed sub-levels: $($failedLevels -join ', ')" -ForegroundColor Yellow
    Write-Host "Some advanced functionality may not work. Review and fix issues." -ForegroundColor Yellow
    exit 2
}