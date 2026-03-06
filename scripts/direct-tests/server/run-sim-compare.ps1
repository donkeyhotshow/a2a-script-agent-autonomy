# Run Server sim-compare from repo root. Origin: a2a-server/scripts/sim-compare.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repo 'a2a-server'
Push-Location $serverDir
try { npx tsx scripts/sim-compare.ts @args } finally { Pop-Location }
