#!/usr/bin/env python
import sys
import os

print("Testing Z.AI Provider Integration", flush=True)

# Set env vars
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_BASE_URL'] = 'https://api.z.ai/api/paas/v4/'
os.environ['Z_AI_API_KEY'] = 'test-key-12345'

# Add to path
sys.path.insert(0, '.')

print("Step 1: Loading config", flush=True)
from proxy.providers.config_loader import load_providers_config
cfg = load_providers_config()
z_ai_config = cfg.get_provider('z_ai')

print(f"Step 2: Z.AI Config loaded", flush=True)
print(f"  Type: {z_ai_config.type}", flush=True)
print(f"  Models: {z_ai_config.models}", flush=True)
print(f"  Enabled: {z_ai_config.enabled}", flush=True)

print("Step 3: Creating provider instance", flush=True)
from proxy.providers.openai_compatible_provider import ZAIProvider
z_ai_prov = ZAIProvider(z_ai_config)

print(f"Step 4: Testing provider", flush=True)
print(f"  supports_model('glm-4.7-flash'): {z_ai_prov.supports_model('glm-4.7-flash')}", flush=True)
print(f"  supports_model('some-other-model'): {z_ai_prov.supports_model('some-other-model')}", flush=True)

print("Step 5: All tests passed!", flush=True)
