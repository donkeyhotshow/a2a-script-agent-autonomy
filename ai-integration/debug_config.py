#!/usr/bin/env python
import sys
sys.path.insert(0, '.')

from proxy.providers.config_loader import load_providers_config

cfg = load_providers_config()
z_ai = cfg.get_provider('z_ai')

print(f"Z.AI Provider: {z_ai.name if z_ai else 'NOT FOUND'}")
if z_ai:
    print(f"  Type: {z_ai.type}")
    print(f"  Enabled: {z_ai.enabled}")
    print(f"  Models: {z_ai.models}")
    print(f"  Contains glm-4.7-flash: {'glm-4.7-flash' in z_ai.models}")
