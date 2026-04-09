# Provider configuration

- **`providers.json`** — your local file with API keys and provider settings. It is **gitignored** (see `../.gitignore`); copy from the template after clone.
- **`providers.example.json`** — committed template (placeholder secrets). Edit `api_keys` and `providers.z_ai.api_key`, then save as `providers.json`.

If `providers.json` is missing, the proxy falls back to **`providers.example.json`** (see `proxy/providers/config_loader.py`).

Full reference: [`../docs/configuration/PROVIDERS_AND_API_KEYS.md`](../docs/configuration/PROVIDERS_AND_API_KEYS.md).
