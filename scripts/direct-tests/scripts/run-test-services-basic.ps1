# Origin: scripts/test-services-basic.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
& (Join-Path $repo 'scripts\tests\test-services-basic.ps1') @args
