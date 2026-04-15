#!/usr/bin/env python
"""
Verification script: Ensure all LLM requests go to Z.AI, not Local LLM upstream.

This script checks:
1. Local LLM upstream provider is disabled in providers.json
2. Z.AI is the default provider
3. Z.AI is first in the fallback chain
4. Environment variables are properly configured
5. No requests would route to Local LLM upstream
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv


def load_env_file():
    """Load .env file"""
    env_file = Path('.env')
    if env_file.exists():
        load_dotenv(env_file)
        print(f"  ℹ️  Loaded .env file")
        return True
    else:
        print(f"  ⚠️  .env file not found at {env_file}")
        return False

def check_providers_config():
    """Check providers.json configuration"""
    print("\n" + "="*70)
    print("1. CHECKING PROVIDERS.JSON CONFIGURATION")
    print("="*70)
    
    config_path = Path('config/providers.json')
    if not config_path.exists():
        print(f"❌ Config file not found: {config_path}")
        return False
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    # Check Local LLM upstream is disabled
    compat_llm_config = config['providers'].get('compat_llm', {})
    is_compat_llm_disabled = compat_llm_config.get('enabled', True) == False
    
    print(f"\nLocal LLM upstream Provider:")
    print(f"  - Enabled: {compat_llm_config.get('enabled')} {'✅' if is_compat_llm_disabled else '❌'}")
    
    # Check Z.AI is default
    default_provider = config.get('default_provider', '')
    is_z_ai_default = default_provider == 'z_ai'
    
    print(f"\nDefault Provider:")
    print(f"  - Default: {default_provider} {'✅' if is_z_ai_default else '❌'}")
    
    # Check fallback chain
    fallback_chain = config.get('fallback_chain', [])
    is_z_ai_first = fallback_chain[0] == 'z_ai' if fallback_chain else False
    
    print(f"\nFallback Chain:")
    print(f"  - Chain: {fallback_chain}")
    print(f"  - Z.AI first: {is_z_ai_first} {'✅' if is_z_ai_first else '❌'}")
    
    # Check Z.AI is enabled
    z_ai_config = config['providers'].get('z_ai', {})
    is_z_ai_enabled = z_ai_config.get('enabled', False)
    
    print(f"\nZ.AI Provider:")
    print(f"  - Enabled: {is_z_ai_enabled} {'✅' if is_z_ai_enabled else '❌'}")
    print(f"  - Models: {z_ai_config.get('models', [])}")
    
    return is_compat_llm_disabled and is_z_ai_default and is_z_ai_first and is_z_ai_enabled


def check_env_vars():
    """Check environment variables"""
    print("\n" + "="*70)
    print("2. CHECKING ENVIRONMENT VARIABLES")
    print("="*70)
    
    # Required Z.AI variables
    z_ai_vars = {
        'Z_AI_BASE_URL': os.getenv('Z_AI_BASE_URL'),
        'Z_AI_MODEL': os.getenv('Z_AI_MODEL'),
        'Z_AI_API_KEY': os.getenv('Z_AI_API_KEY'),
    }
    
    all_set = True
    for var, value in z_ai_vars.items():
        is_set = bool(value)
        status = '✅' if is_set else '❌'
        display_value = value[:20] + '...' if value and len(value) > 20 else value
        print(f"  {var}: {display_value} {status}")
        if not is_set:
            all_set = False
    
    # Legacy Local LLM upstream variables (should be ignored now)
    print(f"\n  [Legacy, should be ignored]")
    print(f"  LOCAL_LLM_UPSTREAM_URL: {os.getenv('LOCAL_LLM_UPSTREAM_URL')}")
    print(f"  LOCAL_LLM_MODEL: {os.getenv('LOCAL_LLM_MODEL')}")
    
    return all_set


def check_router_logic():
    """Load and test router logic"""
    print("\n" + "="*70)
    print("3. CHECKING ROUTER LOGIC")
    print("="*70)
    
    try:
        sys.path.insert(0, '.')
        from proxy.providers.config_loader import load_providers_config
        from proxy.providers.router import ProviderRouter
        
        config = load_providers_config()
        router = ProviderRouter(config)
        
        # Check which providers are enabled
        enabled_providers = [name for name, provider_config in config.providers.items() 
                           if provider_config.enabled]
        
        print(f"\nEnabled Providers: {enabled_providers}")
        print(f"  - Local LLM upstream in enabled: {'❌ YES (should be disabled)' if 'compat_llm' in enabled_providers else '✅ NO'}")
        print(f"  - Z.AI in enabled: {'✅ YES' if 'z_ai' in enabled_providers else '❌ NO'}")
        
        # Test provider selection for default model
        default_model = config.get_provider(config.default_provider)
        if default_model and default_model.models:
            test_model = default_model.models[0]
            
            import asyncio
            asyncio.run(router.initialize())
            
            chain = router._get_provider_chain(test_model)
            print(f"\nProvider Chain for '{test_model}':")
            if chain:
                for i, (name, provider) in enumerate(chain, 1):
                    print(f"  {i}. {name} ✅")
                    if name == 'z_ai':
                        print(f"     └─ This is correct! Z.AI is being used.")
                        return True
                # If we got here and compat_llm is in the chain before z_ai
                if any(name == 'compat_llm' for name, _ in chain):
                    print(f"  ❌ WARNING: Local LLM upstream is in the chain!")
                    return False
            else:
                print(f"  ❌ Error: No provider chain returned!")
                return False
        
        return True
        
    except Exception as e:
        print(f"  ❌ Error loading router: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all checks"""
    print("\n" + "🔍 Z.AI ROUTING VERIFICATION ".center(70, "="))
    
    # Load .env file first
    print("\nLoading configuration...")
    load_env_file()
    
    checks = [
        ("Config check", check_providers_config),
        ("Environment vars", check_env_vars),
        ("Router logic", check_router_logic),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ {name} failed with error: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {name}: {status}")
    
    all_pass = all(result for _, result in results)
    
    print("\n" + "="*70)
    if all_pass:
        print("✅ ALL CHECKS PASSED - Requests will go to Z.AI, not Local LLM upstream!")
    else:
        print("❌ SOME CHECKS FAILED - Please fix the issues above")
    print("="*70 + "\n")
    
    return 0 if all_pass else 1


if __name__ == '__main__':
    sys.exit(main())
