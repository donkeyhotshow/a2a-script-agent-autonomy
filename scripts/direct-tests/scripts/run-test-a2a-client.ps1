# Origin: scripts/test-a2a-client.ps1
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
& (Join-Path $repo 'scripts\test-a2a-client.ps1') @args
