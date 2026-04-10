import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from proxy.providers.config_loader import load_providers_config
from proxy.providers.router import PROVIDER_REGISTRY

config = load_providers_config()

print("=" * 60)
print("Provider Configuration and Registry")
print("=" * 60)

print("\n1. Loaded Providers from Config:")
for name, provider_config in config.providers.items():
    print(f"   - {name}: type={provider_config.type}, enabled={provider_config.enabled}")

print("\n2. Provider Registry (available classes):")
for provider_type, provider_class in PROVIDER_REGISTRY.items():
    print(f"   - {provider_type}: {provider_class.__name__}")

print("\n3. Default Provider:")
print(f"   {config.default_provider}")

print("\n4. Fallback Chain:")
print(f"   {config.fallback_chain}")

print("\n5. Z.AI Configuration:")
zai = config.get_provider('z_ai')
if zai:
    print(f"   Name: {zai.name}")
    print(f"   Type: {zai.type}")
    print(f"   URL: {zai.url}")
    print(f"   Enabled: {zai.enabled}")
    print(f"   Models: {zai.models}")
else:
    print("   NOT FOUND!")
