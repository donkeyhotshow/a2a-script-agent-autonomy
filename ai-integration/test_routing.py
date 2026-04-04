#!/usr/bin/env python
"""Test Z.AI provider routing directly"""
import sys
import os
import asyncio
sys.path.insert(0, '.')

# Set env vars
os.environ['Z_AI_BASE_URL'] = 'https://api.z.ai/api/paas/v4/'
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_API_KEY'] = 'test-key-12345'

from proxy.providers.router import ProviderRouter

async def main():
    router = ProviderRouter()
    await router.initialize()
    
    print(f"Initialized providers: {list(router._providers.keys())}")
    
    # Check if Z.AI provider is there
    if 'z_ai' in router._providers:
        z_ai = router._providers['z_ai']
        print(f"Z.AI provider found!")
        print(f"  Config models: {z_ai.config.models}")
        print(f"  supports_model('glm-4.7-flash'): {z_ai.supports_model('glm-4.7-flash')}")
    else:
        print("Z.AI provider NOT found in router._providers")
    
    # Test _get_provider_chain
    print("\nTesting _get_provider_chain:")
    print(f"  Model: 'glm-4.7-flash'")
    chain = router._get_provider_chain('glm-4.7-flash')
    print(f"  Chain length: {len(chain)}")
    if chain:
        for name, prov in chain:
            print(f"    - {name}")
    else:
        print("    (empty - this is the problem!)")
    
    # Test _resolve_model
    print(f"\nTesting _resolve_model:")
    print(f"  Input model: 'any-random-model'")
    resolved = router._resolve_model('any-random-model')
    print(f"  Resolved model: '{resolved}'")

asyncio.run(main())
