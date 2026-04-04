#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Run a2a-server unit tests (Vitest) — no live stack required.
.DESCRIPTION
    Server unit tests mock LLM/external calls. They catch processor logic,
    transform bugs, routing, and shape violations before you start the stack.
.EXAMPLE
    .\tests\indirect-tests\run-server-unit-tests.ps1
    .\tests\indirect-tests\run-server-unit-tests.ps1 -Filter "router|action"
#>
param(
    [string]$Filter = "",
    [switch]$Watch
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location (Join-Path $RepoRoot 'a2a-server')

$env:NODE_ENV = 'test'
$env:ENCRYPTION_KEY = '12345678901234567890123456789012'  # 32 chars for test
$env:JWT_SECRET = 'test-jwt-secret-32-chars-long!!!!!'

$vitestCmd = "npx vitest run"
if ($Watch) { $vitestCmd = "npx vitest" }
if ($Filter) { $vitestCmd += " --reporter=verbose --testNamePattern=`"$Filter`"" }

Write-Host "=== Running a2a-server unit tests ===" -ForegroundColor Cyan
Invoke-Expression $vitestCmd
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] Server unit tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Server unit tests passed" -ForegroundColor Green
