# Origin: scripts/web-ui-smoke-report.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
& (Join-Path $repo 'scripts\web-ui-smoke-report.ps1') @args
