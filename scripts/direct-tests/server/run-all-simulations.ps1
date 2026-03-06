# Origin: a2a-server/scripts/run-all-simulations.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-server')
try { npx tsx scripts/run-all-simulations.ts @args } finally { Pop-Location }
