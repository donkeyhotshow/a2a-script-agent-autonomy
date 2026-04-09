# Run RAG test-cached from repo root. Origin: a2a-client/packages/rag/scripts/test-cached.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$ragDir = Join-Path $repo 'a2a-client\packages\rag'
Push-Location $ragDir
try { node scripts/test-cached.js @args } finally { Pop-Location }
