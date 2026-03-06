# Origin: a2a-client/packages/rag/scripts/test-perf.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-client\packages\rag')
try { node scripts/test-perf.js @args } finally { Pop-Location }
