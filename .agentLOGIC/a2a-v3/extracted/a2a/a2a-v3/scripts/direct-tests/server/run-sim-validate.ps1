# Run Server sim-validate from repo root. Origin: a2a-server/scripts/sim-validate.ts
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serverDir = Join-Path $repo 'a2a-server'
Push-Location $serverDir
try { npx tsx scripts/sim-validate.ts @args } finally { Pop-Location }
