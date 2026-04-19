"""Extension _30_solutions — find similar past solutions and add to context."""
from typing import Any, Dict, List

from core.logger import get_logger
from features.memory.manager import MemoryManager

_log = get_logger("ext.memory_load.solutions")


async def run(memory: MemoryManager, goal: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """Retrieve similar solutions for *goal* from the solutions store."""
    solutions = await memory.find_similar_solutions(goal, top_k=top_k)
    _log.info("Found %d similar solutions for goal: %s", len(solutions), goal[:60])
    return solutions
