#!/usr/bin/env python
"""Debug script for Z.AI provider routing issue"""
import sys
import os
import asyncio

# Set environment variables before importing modules
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_BASE_URL'] = 'https://api.z.ai/api/paas/v4/'
os.environ['Z_AI_API_KEY'] = 'test-key-12345'

# Add current directory to path
sys.path.insert(0, '.')

from proxy.providers.config_loader import load_providers_config
from proxy.providers.router import ProviderRouter

async def main():
    print("=== Debugging Z.AI Provider Integration ===\n")
    
    # 1. Load the providers config
    print("1. Loading providers config...")
    config = load_providers_config()
    print(f"   Config loaded. Default provider: {config.default_provider}")
    
    # 2. Check if Z.AI provider is in the config
    print("\n2. Checking if Z.AI provider is in config...")
    if 'z_ai' in config.providers:
        z_ai_config = config.providers['z_ai']
        print("   Z.AI provider found in config")
        print(f"   Type: {z_ai_config.type}")
        print(f"   Enabled: {z_ai_config.enabled}")
    else:
        print("   Z.AI provider NOT found in config")
        return
    
    # 3. Print the Z.AI provider's models list (to verify env var resolution)
    print("\n3. Z.AI provider models list:")
    print(f"   Models: {z_ai_config.models}")
    
    # 4. Check if 'glm-4.7-flash' is in the models list
    print("\n4. Checking if 'glm-4.7-flash' is in models list...")
    if 'glm-4.7-flash' in z_ai_config.models:
        print("   'glm-4.7-flash' is in the models list ✓")
    else:
        print("   'glm-4.7-flash' is NOT in the models list ✗")
    
    # 5. Initialize the ProviderRouter and check _providers dict
    print("\n5. Initializing ProviderRouter...")
    router = ProviderRouter(config)
    await router.initialize()
    print(f"   Router initialized. Providers in _providers dict: {list(router._providers.keys())}")
    
    if 'z_ai' in router._providers:
        z_ai_provider = router._providers['z_ai']
        print("   Z.AI provider initialized successfully")
        print(f"   Provider supports 'glm-4.7-flash': {z_ai_provider.supports_model('glm-4.7-flash')}")
    else:
        print("   Z.AI provider NOT found in router._providers")
    
    # 6. Call _get_provider_chain('glm-4.7-flash') and print the result
    print("\n6. Testing _get_provider_chain('glm-4.7-flash')...")
    chain = router._get_provider_chain('glm-4.7-flash')
    print(f"   Chain length: {len(chain)}")
    if chain:
        print("   Chain:")
        for name, provider in chain:
            print(f"     - {name}")
    else:
        print("   Chain is empty (this causes the error)")
    
    # 7. Test the _resolve_model() method
    print("\n7. Testing _resolve_model() method...")
    test_models = ['glm-4.7-flash', 'some-other-model', 'random-model']
    for model in test_models:
        resolved = router._resolve_model(model)
        print(f"   '{model}' -> '{resolved}'")

if __name__ == "__main__":
    asyncio.run(main())
