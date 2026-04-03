<#
.SYNOPSIS
    Run all post-start direct integration tests (hub + vitest + node + PS1 flows).
.DESCRIPTION
    Client API port 3001, Web 5173 (matches scripts/start-client-api.bat / start-web-ui.bat).
    Child .ps1 scripts are run in separate processes so their exit does not stop this runner.
    Set A2A_POST_START_SKIP_HEAVY=1 to skip long LLM-heavy steps (full e2e, gray-room, dialog/agent PS1, server-invoke);
    a short e2e smoke subset still runs.
.EXAMPLE
    .\tests\direct-tests\run-post-start-all.ps1
#>
param(
    [switch]$SkipHeavy
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $RepoRoot

$ClientPort = 3001
$WebPort = 5173
$ServerPort = 3000

if ($env:A2A_POST_START_SKIP_HEAVY -eq '1') { $SkipHeavy = $true }

$failed = 0

function Invoke-Ps1File {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [string[]]$Arguments = @()
    )
    $all = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Path) + $Arguments
    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList $all -Wait -PassThru -NoNewWindow
    return $p.ExitCode
}

function Step {
    param([string]$Title, [scriptblock]$Block)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
    try {
        & $Block
        $ec = $LASTEXITCODE
        if ($null -ne $ec -and $ec -ne 0) {
            throw "exit code $ec"
        }
        Write-Host "[OK] $Title" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $Title : $_" -ForegroundColor Red
        $script:failed++
    }
}

Step "Hub checks (Full, Client $ClientPort, Web $WebPort)" {
    $path = Join-Path $PSScriptRoot 'run-checks.ps1'
    $ec = Invoke-Ps1File $path @(
        '-Scope', 'Full',
        '-ServerPort', "$ServerPort",
        '-ClientPort', "$ClientPort",
        '-WebPort', "$WebPort"
    )
    if ($ec -ne 0) { throw "run-checks.ps1 exit $ec" }
}

Step "Vitest direct-tests" {
    npm run test:direct-tests
    if ($LASTEXITCODE -ne 0) { throw "npm exit $LASTEXITCODE" }
}

$env:CLIENT_API_URL = "http://localhost:$ClientPort"
$env:A2A_SERVER_URL = "http://localhost:$ServerPort"
$env:AI_HUB_URL = 'http://localhost:11434'

Step "router-choice-transition.test.mjs" {
    node (Join-Path $PSScriptRoot 'router-choice-transition.test.mjs')
    if ($LASTEXITCODE -ne 0) { throw "node exit $LASTEXITCODE" }
}

if (-not $SkipHeavy) {
    Step "e2e-dialog-test.js (full DEFAULT_ORDER)" {
        node (Join-Path $PSScriptRoot 'e2e-dialog-test.js')
        if ($LASTEXITCODE -ne 0) { throw "node exit $LASTEXITCODE" }
    }

    Step "gray-room-test.js" {
        node (Join-Path $PSScriptRoot 'gray-room-test.js')
        if ($LASTEXITCODE -ne 0) { throw "node exit $LASTEXITCODE" }
    }

    Step "test-dialog-flow.ps1" {
        $ec = Invoke-Ps1File (Join-Path $PSScriptRoot 'test-dialog-flow.ps1') @('-ClientPort', "$ClientPort", '-ServerPort', "$ServerPort")
        if ($ec -ne 0) { throw "test-dialog-flow.ps1 exit $ec" }
    }

    Step "test-agent-flow.ps1" {
        $ec = Invoke-Ps1File (Join-Path $PSScriptRoot 'test-agent-flow.ps1') @('-ClientPort', "$ClientPort", '-ServerPort', "$ServerPort")
        if ($ec -ne 0) { throw "test-agent-flow.ps1 exit $ec" }
    }

    Step "server-invoke-agent.ps1" {
        $ec = Invoke-Ps1File (Join-Path $PSScriptRoot 'server-invoke-agent.ps1') @('-ClientPort', "$ClientPort", '-ServerPort', "$ServerPort")
        if ($ec -ne 0) { throw "server-invoke-agent.ps1 exit $ec" }
    }
} else {
    Write-Host ""
    Write-Host "[SKIP] Heavy direct tests — use full run without A2A_POST_START_SKIP_HEAVY=1" -ForegroundColor Yellow

    Step "e2e-dialog-test.js (smoke subset)" {
        node (Join-Path $PSScriptRoot 'e2e-dialog-test.js') '--only=clientProjects,serverHealth,serverHealthJson,invokeHello,agentSeed,clientSessionsList'
        if ($LASTEXITCODE -ne 0) { throw "node exit $LASTEXITCODE" }
    }
}

Write-Host ""
if ($failed -eq 0) {
    Write-Host "=== POST-START DIRECT TESTS: PASS ===" -ForegroundColor Green
    exit 0
}
Write-Host "=== POST-START DIRECT TESTS: FAIL ($failed step(s)) ===" -ForegroundColor Red
exit 1
