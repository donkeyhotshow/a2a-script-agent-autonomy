# Origin: scripts/test-a2a-client.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
& (Join-Path $repo 'scripts\tests\test-a2a-client.ps1') @args
