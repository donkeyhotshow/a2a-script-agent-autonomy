# Origin: a2a-client/packages/rag/scripts/test-rag-on-project.js
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'a2a-client\packages\rag')
try { node scripts/test-rag-on-project.js @args } finally { Pop-Location }
