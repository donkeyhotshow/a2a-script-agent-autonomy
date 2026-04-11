#!/usr/bin/env python
import sys
import os
import asyncio

print("Testing Provider Router", flush=True)

# Set env vars
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_BASE_URL'] = 'https://api.z.ai/api/paas/v4/'
os.environ['Z_AI_API_KEY'] = 'test-key-12345'

# Add to path
sys.path.insert(0, '.')

print("Step 1: Loading config", flush=True)
from proxy.providers.config_loader import load_providers_config
cfg = load_providers_config()

print(f"Step 2: Config loaded", flush=True)
print(f"  Default provider: {cfg.default_provider}", flush=True)
print(f"  Fallback chain: {cfg.fallback_chain}", flush=True)
print(f"  Enabled providers: {[p.name for p in cfg.providers.values() if p.enabled]}", flush=True)

print("Step 3: Creating router and testing _get_provider_chain synchronously", flush=True)
from proxy.providers.router import ProviderRouter

router = ProviderRouter(cfg)

# Test without initializing (test the sync part)
router._providers = {}  # Empty for now
chain = router._get_provider_chain('glm-4.7-flash')
print(f"  Chain (before init): {[(name, type(prov).__name__) for name, prov in chain]}", flush=True)

print("Step 4: Now let's see what's in _get_provider_chain if we manually add the provider", flush=True)

# Manually create and add the Z.AI provider
from proxy.providers.openai_compatible_provider import ZAIProvider
z_ai_config = cfg.get_provider('z_ai')
z_ai_prov = ZAIProvider(z_ai_config)
router._providers['z_ai'] = z_ai_prov

chain = router._get_provider_chain('glm-4.7-flash')
print(f"  Chain (with manual provider): length={len(chain)}", flush=True)
for name, prov in chain:
    print(f"    - {name}: supports_model='{ prov.supports_model('glm-4.7-flash')}'", flush=True)

print("Step 5: Test with router.initialize() - try with timeout", flush=True)

async def test_init():
    try:
        await asyncio.wait_for(router.initialize(), timeout=2.0)
        print(f"  Init completed", flush=True)
    except asyncio.TimeoutError:
        print(f"  Init TIMEOUT after 2.0s", flush=True)
    except Exception as e:
        print(f"  Init ERROR: {type(e).__name__}: {e}", flush=True)
    
    print(f"  Providers in _providers: {list(router._providers.keys())}", flush=True)
    if 'z_ai' in router._providers:
        prov = router._providers['z_ai']
        print(f"    Z.AI provider found", flush=True)
        print(f"    Z.AI supports_model('glm-4.7-flash'): {prov.supports_model('glm-4.7-flash')}", flush=True)
    else:
        print(f"    Z.AI provider NOT in _providers", flush=True)

asyncio.run(test_init())

print("Done!", flush=True)
