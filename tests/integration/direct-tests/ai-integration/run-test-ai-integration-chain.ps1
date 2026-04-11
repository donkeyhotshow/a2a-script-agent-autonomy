# Origin: a2a-ai-hub/scripts/test_ai_integration_chain.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
Push-Location (Join-Path $repo 'a2a-ai-hub')
try { python scripts/test_ai_integration_chain.py @args } finally { Pop-Location }
