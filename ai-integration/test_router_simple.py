#!/usr/bin/env python
import sys
import os

print("Step 1: Starting", flush=True)

# Set env vars
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_BASE_URL'] = 'https://api.z.ai/api/paas/v4/'
os.environ['Z_AI_API_KEY'] = 'test-key-12345'

# Add to path
sys.path.insert(0, '.')

print("Step 2: Importing config_loader", flush=True)
from proxy.providers.config_loader import load_providers_config
print("Step 3: Config loader imported", flush=True)

print("Step 4: Loading config", flush=True)
cfg = load_providers_config()
print("Step 5: Config loaded", flush=True)

print("Step 6: Importing router", flush=True)
from proxy.providers.router import ProviderRouter
print("Step 7: Router imported", flush=True)

print("Step 8: Creating router instance", flush=True)
router = ProviderRouter(cfg)
print("Step 9: Router created", flush=True)

print("Step 10: Testing _get_provider_chain (without init)", flush=True)
# Don't call initialize yet - just test the sync methods
chain = router._get_provider_chain('glm-4.7-flash')
print(f"Step 11: Chain result = {chain}", flush=True)

print("Done!", flush=True)
