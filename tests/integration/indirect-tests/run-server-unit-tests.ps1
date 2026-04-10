#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run a2a-server Vitest — default: offline-safe (no tests/integration, no tests/e2e).
.DESCRIPTION
    By default excludes tests/integration/** and tests/e2e/** (real HTTP, LLM, long timeouts).
    Use -IncludeIntegration to run the full a2a-server suite (needs stack/services as those tests expect).
.EXAMPLE
    .\tests\indirect-tests\run-server-unit-tests.ps1
    .\tests\indirect-tests\run-server-unit-tests.ps1 -Filter "router|action"
    .\tests\indirect-tests\run-server-unit-tests.ps1 -IncludeIntegration
#>
param(
    [string]$Filter = "",
    [switch]$Watch,
    [switch]$IncludeIntegration
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location (Join-Path $RepoRoot 'a2a-server')

$env:NODE_ENV = 'test'
$env:ENCRYPTION_KEY = '12345678901234567890123456789012'  # 32 chars for test
$env:JWT_SECRET = 'test-jwt-secret-32-chars-long!!!!!'

if ($IncludeIntegration) {
    $vitestCmd = if ($Watch) { "npx vitest" } else { "npx vitest run" }
} else {
    $vitestCmd = if ($Watch) {
        "npx vitest --exclude tests/integration/** --exclude tests/e2e/**"
    } else {
        "npx vitest run --exclude tests/integration/** --exclude tests/e2e/**"
    }
}
if ($Filter) { $vitestCmd += " --reporter=verbose --testNamePattern=`"$Filter`"" }

$vitestMode = if ($IncludeIntegration) { 'full (integration+e2e)' } else { 'offline (no integration/e2e)' }
Write-Host "=== Running a2a-server Vitest - $vitestMode ===" -ForegroundColor Cyan
Invoke-Expression $vitestCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Server unit tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Server unit tests passed" -ForegroundColor Green
