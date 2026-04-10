# Shared runner for staged test suites
function Invoke-TestSequence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Title,
        [Parameter(Mandatory)]
        [array]$Stages,
        [string]$Description = "",
        [switch]$VerboseOutput,
        [switch]$ContinueOnError,
        [switch]$Quick,
        [switch]$Light,
        [string]$BasePath = $PSScriptRoot
    )

    if (-not $Stages) {
        throw "Invoke-TestSequence requires at least one stage definition."
    }

    Write-Host "$Title" -ForegroundColor Cyan
    if ($Description) {
        Write-Host $Description -ForegroundColor Gray
    }
    Write-Host ""

    $failedStages = @()
    $stagesExecuted = 0
    $stoppedEarly = $false

    foreach ($stage in $Stages) {
        $stagesExecuted++
        $stageName = $stage.Name
        $stageDescription = if ($stage.Description) { $stage.Description } else { "No description provided." }

        Write-Host "> Running $stageName" -ForegroundColor Yellow
        Write-Host "  $stageDescription" -ForegroundColor Gray
        Write-Host ""

        if (-not $stage.Path) {
            Write-Host "[SKIP] ${stageName}: path is not specified." -ForegroundColor Yellow
            continue
        }

        $scriptPath = if ([System.IO.Path]::IsPathRooted($stage.Path)) {
            $stage.Path
        } else {
            Join-Path $BasePath $stage.Path
        }

        if (-not (Test-Path $scriptPath)) {
            Write-Host "[FAIL] $stageName path not found: $scriptPath" -ForegroundColor Red
            $failedStages += [pscustomobject]@{ Name = $stageName; Path = $scriptPath; Reason = 'NotFound' }
            $stoppedEarly = -not $ContinueOnError
            if (-not $ContinueOnError) { break }
            continue
        }

        $arguments = @()
        if ($VerboseOutput -and (-not $stage.SkipVerbose)) { $arguments += '-Verbose' }
        if ($ContinueOnError -and (-not $stage.SkipContinue)) { $arguments += '-ContinueOnError' }

        if ($Quick -and $stage.InheritFlags -and ($stage.InheritFlags -contains 'Quick')) {
            $arguments += '-Quick'
        }

        if ($Light -and $stage.InheritFlags -and ($stage.InheritFlags -contains 'Light')) {
            $arguments += '-Light'
        }

        if ($stage.Switches) {
            $arguments += $stage.Switches
        }

        if ($stage.Arguments) {
            $arguments += $stage.Arguments
        }

        try {
            & $scriptPath @arguments
            $exitCode = $LASTEXITCODE

            if ($exitCode -ne 0) {
                Write-Host "[FAIL] $stageName exited with code $exitCode" -ForegroundColor Red
                $failedStages += [pscustomobject]@{ Name = $stageName; Path = $scriptPath; ExitCode = $exitCode }
                $stoppedEarly = -not $ContinueOnError
                if (-not $ContinueOnError) { break }
                continue
            } else {
                Write-Host "[PASS] $stageName completed" -ForegroundColor Green
            }
        } catch {
            Write-Host "[ERR] $stageName encountered an error: $($_.Exception.Message)" -ForegroundColor Red
            $failedStages += [pscustomobject]@{ Name = $stageName; Path = $scriptPath; Reason = $_.Exception.Message }
            $stoppedEarly = -not $ContinueOnError
            if (-not $ContinueOnError) { break }
            continue
        }
    }

    return [pscustomobject]@{
        Title = $Title
        Description = $Description
        TotalStages = $Stages.Count
        ExecutedStages = $stagesExecuted
        FailedStages = $failedStages
        StoppedEarly = $stoppedEarly
        HasFailures = $failedStages.Count -gt 0
    }
}
