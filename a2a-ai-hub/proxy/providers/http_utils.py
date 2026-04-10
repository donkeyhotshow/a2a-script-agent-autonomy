"""HTTP client helpers for LLM providers."""

import aiohttp


def aiohttp_llm_timeout(seconds: int) -> aiohttp.ClientTimeout:
    """0 or negative = no total limit on LLM calls (wait until the server responds)."""
    if seconds <= 0:
        return aiohttp.ClientTimeout(total=None)
    return aiohttp.ClientTimeout(total=seconds)
