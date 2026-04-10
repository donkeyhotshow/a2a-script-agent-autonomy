"""Rules use path equality; trailing slash on the request path should not break matches."""

from proxy.ai_hub_config import _match_when


def test_match_when_path_treats_trailing_slash_as_equivalent():
    when = {"path": "api/chat", "method": "POST"}
    compiled: dict = {}
    # Same logical path as config, but request URL often ends with /
    assert _match_when(
        when,
        method="POST",
        path="/api/chat/",
        requested_model=None,
        resolved_model=None,
        prompt="",
        compiled_rule=compiled,
    )
