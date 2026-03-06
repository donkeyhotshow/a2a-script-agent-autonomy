# Origin: a2a-client/packages/rag/scripts/rag-batch-test.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-client\packages\rag')
try { node scripts/rag-batch-test.js @args } finally { Pop-Location }
