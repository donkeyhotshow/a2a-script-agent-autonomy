import asyncio
import time
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from proxy.providers.config_loader import load_providers_config
from proxy.providers.openai_compatible_provider import ZAIProvider

async def test_zai_delay():
    """Test Z.AI request delay functionality"""
    config = load_providers_config()
    zai_config = config.get_provider('z_ai')

    if not zai_config:
        print("Z.AI config not found")
        return

    print(f"Testing Z.AI with request_delay_seconds: {zai_config.request_delay_seconds}")

    # Create provider instance
    provider = ZAIProvider(zai_config)

    print("Making first request (should be immediate)...")
    start_time = time.time()

    # Simulate request delay check
    await provider._check_request_delay()
    first_delay = time.time() - start_time
    print(".2f")

    # Simulate request completion
    await provider._mark_request_completed()

    print("Making second request (should have delay)...")
    start_time = time.time()

    # Check delay again
    await provider._check_request_delay()
    second_delay = time.time() - start_time
    print(".2f")

    if second_delay >= zai_config.request_delay_seconds - 0.1:  # Allow small tolerance
        print("✓ Delay working correctly!")
    else:
        print("✗ Delay not working as expected")

if __name__ == '__main__':
    asyncio.run(test_zai_delay())