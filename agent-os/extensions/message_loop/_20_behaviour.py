"""Extension _20_behaviour — inject behaviour.md into system prompt context."""
from core.logger import get_logger
from features.memory.manager import MemoryManager

_log = get_logger("ext.message_loop.behaviour")


async def run(memory: MemoryManager) -> str:
    """Load and return the behaviour string from behaviour.md."""
    behaviour = await memory.load_behaviour()
    if behaviour:
        _log.info("Behaviour loaded (%d chars)", len(behaviour))
    else:
        _log.warning("behaviour.md not found or empty")
    return behaviour
