"""Extension _10_skills — load skills and build FAISS index at agent init."""
from core.logger import get_logger
from features.skills.loader import SkillLoader

_log = get_logger("ext.agent_init.skills")


async def run(skill_loader: SkillLoader) -> list:
    """Load all skills and return list of loaded names."""
    _log.info("Loading skills...")
    loaded = skill_loader.load_all()
    _log.info("Skills loaded: %s", loaded)
    return loaded
