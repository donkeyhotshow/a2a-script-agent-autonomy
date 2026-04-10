import os
from proxy.providers.config_loader import _resolve_env_var, _resolve_env_vars_in_dict

# Set some environment variables
os.environ['Z_AI_MODEL'] = 'glm-4.7-flash'
os.environ['Z_AI_API_KEY'] = 'test-key'

# Test single variable resolution
test_cases = [
    "${Z_AI_MODEL}",
    "${Z_AI_MODEL:-default-model}",
    "${NONEXISTENT:-fallback-value}",
    "https://api.z.ai/paas/${Z_AI_MODEL}/v4"
]

print("Testing _resolve_env_var():")
for test in test_cases:
    result = _resolve_env_var(test)
    print(f"  {test} => {result}")

# Test dictionary resolution
test_dict = {
    "url": "${Z_AI_BASE_URL:-https://api.z.ai/api/paas/v4/}",
    "api_key": "${Z_AI_API_KEY}",
    "models": ["${Z_AI_MODEL:-glm-4.7-flash}"],
}

print("\nTesting _resolve_env_vars_in_dict():")
result_dict = _resolve_env_vars_in_dict(test_dict)
print(f"  Input: {test_dict}")
print(f"  Output: {result_dict}")
