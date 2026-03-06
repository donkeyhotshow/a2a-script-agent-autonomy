# Origin: a2a-server/scripts/sim-run.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-server')
try { npx tsx scripts/sim-run.ts @args } finally { Pop-Location }
