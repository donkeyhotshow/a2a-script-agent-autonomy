# Origin: a2a-ai-hub/scripts/test_ai_integration.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$aiDir = Join-Path $repo 'a2a-ai-hub'
Push-Location $aiDir
try { python scripts/test_ai_integration.py @args } finally { Pop-Location }
