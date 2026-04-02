import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from proxy.providers.config_loader import load_providers_config

def test_zai():
    config = load_providers_config()

    zai_provider = config.get_provider('z_ai')
    if zai_provider:
        print(f'Z.AI provider found!')
        print(f'Name: {zai_provider.name}')
        print(f'Type: {zai_provider.type}')
        print(f'URL: {zai_provider.url}')
        print(f'Models: {zai_provider.models}')
        print(f'Request delay: {zai_provider.request_delay_seconds}')
        print(f'API Key: {zai_provider.api_key}')
    else:
        print('Z.AI provider not found')
        print('Available providers:', list(config.providers.keys()))

if __name__ == '__main__':
    test_zai()