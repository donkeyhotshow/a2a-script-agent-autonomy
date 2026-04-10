# Origin: ai-integration/scripts/test_ai_integration_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Push-Location (Join-Path $repo 'ai-integration')
try { python scripts/test_ai_integration_chain.py @args } finally { Pop-Location }
