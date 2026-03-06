# Origin: a2a-client/packages/rag/scripts/run-rag-simulation.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-client\packages\rag')
try { node scripts/run-rag-simulation.js @args } finally { Pop-Location }
