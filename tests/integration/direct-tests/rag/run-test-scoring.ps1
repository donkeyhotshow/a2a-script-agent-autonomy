# Run RAG test-scoring from repo root. Origin: a2a-client/packages/rag/scripts/test-scoring.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$ragDir = Join-Path $repo 'a2a-client\packages\rag'
Push-Location $ragDir
try { node scripts/test-scoring.js @args } finally { Pop-Location }
