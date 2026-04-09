#!/usr/bin/env python
import sys
import os

print("Step 1: Starting", flush=True)

# Set env vars
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
print("Step 2: Env vars set", flush=True)

# Add to path
sys.path.insert(0, '.')
print("Step 3: Path updated", flush=True)

# Import config
from proxy.providers.config_loader import load_providers_config
print("Step 4: Imported config loader", flush=True)

# Load config
cfg = load_providers_config()
print("Step 5: Config loaded", flush=True)

# Get Z.AI
z_ai = cfg.get_provider('z_ai')
print(f"Step 6: Z.AI provider = {z_ai.name if z_ai else 'NOT FOUND'}", flush=True)

if z_ai:
    print(f"  - Type: {z_ai.type}", flush=True)
    print(f"  - Enabled: {z_ai.enabled}", flush=True)
    print(f"  - Models: {z_ai.models}", flush=True)

print("Step 7: Done", flush=True)
