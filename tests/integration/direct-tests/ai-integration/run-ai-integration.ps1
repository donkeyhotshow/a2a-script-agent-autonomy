# Origin: ai-integration/scripts/test_ai_integration.py
$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$aiDir = Join-Path $repo 'ai-integration'
Push-Location $aiDir
try { python scripts/test_ai_integration.py @args } finally { Pop-Location }
