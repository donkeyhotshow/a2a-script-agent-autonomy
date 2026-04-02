# Origin: a2a-server/scripts/run-simulation.ts. Usage: .\run-simulation.ps1 <simulation-dir>
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$serverDir = Join-Path $repo 'a2a-server'
Push-Location $serverDir
try { npx tsx scripts/run-simulation.ts @args } finally { Pop-Location }
