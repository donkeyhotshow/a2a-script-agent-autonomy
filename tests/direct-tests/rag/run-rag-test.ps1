# Run RAG test from repo root. Origin: a2a-client/packages/rag/scripts/rag-test.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$ragDir = Join-Path $repo 'a2a-client\packages\rag'
Push-Location $ragDir
try { node scripts/rag-test.js @args } finally { Pop-Location }
