# Origin: scripts/test-web-ui.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
& (Join-Path $repo 'scripts\tests\test-web-ui.ps1') @args
