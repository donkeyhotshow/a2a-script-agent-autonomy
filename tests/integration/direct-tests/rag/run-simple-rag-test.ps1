# Origin: a2a-client/packages/rag/scripts/simple-rag-test.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'a2a-client\packages\rag')
try { node scripts/simple-rag-test.js @args } finally { Pop-Location }
