# Run Server sim-report from repo root. Origin: a2a-server/scripts/sim-report.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$serverDir = Join-Path $repo 'a2a-server'
Push-Location $serverDir
try { npx tsx scripts/sim-report.ts @args } finally { Pop-Location }
