"""Skill loader — reads SKILL.md files and optionally builds a FAISS index."""
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

from core.logger import get_logger
from core.error_handler import handle

_log = get_logger("skills.loader")

try:
    import faiss  # type: ignore
    import numpy as np  # type: ignore
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False


class Skill:
    def __init__(self, name: str, triggers: List[str], body: str) -> None:
        self.name = name
        self.triggers = triggers
        self.body = body

    def __repr__(self) -> str:
        return f"Skill(name={self.name!r}, triggers={self.triggers})"


class SkillLoader:
    """Loads skills from `skills/<name>/SKILL.md` files.

    SKILL.md format:
        ***
        name: theatre-drama
        triggers: ["драма", "монолог", "конфликт"]
        ***

        <body text>
    """

    def __init__(self, skills_dir: str) -> None:
        self._skills_dir = Path(skills_dir)
        self._skills: Dict[str, Skill] = {}
        self._index: Optional[object] = None  # FAISS index (if available)
        self._index_skills: List[Skill] = []

    def load_all(self) -> List[str]:
        """Load all skills from disk. Returns list of loaded skill names."""
        loaded: List[str] = []
        for skill_file in self._skills_dir.glob("*/SKILL.md"):
            try:
                skill = self._parse_skill_file(skill_file)
                self._skills[skill.name] = skill
                loaded.append(skill.name)
                _log.info("Loaded skill: %s (triggers: %s)", skill.name, skill.triggers)
            except Exception as exc:
                handle(exc, f"skills.load:{skill_file}")
        if _FAISS_AVAILABLE and self._skills:
            self._build_index()
        return loaded

    def load_by_name(self, name: str) -> Optional[Skill]:
        if name in self._skills:
            return self._skills[name]
        skill_file = self._skills_dir / name / "SKILL.md"
        if not skill_file.exists():
            _log.warning("Skill file not found: %s", skill_file)
            return None
        try:
            skill = self._parse_skill_file(skill_file)
            self._skills[skill.name] = skill
            return skill
        except Exception as exc:
            handle(exc, f"skills.load_by_name:{name}")
            return None

    def get(self, name: str) -> Optional[Skill]:
        return self._skills.get(name)

    def search_by_trigger(self, query: str, top_k: int = 1) -> List[Skill]:
        """Keyword-based trigger matching (deterministic, no LLM)."""
        query_lower = query.lower()
        scored: List[tuple] = []
        for skill in self._skills.values():
            matches = sum(1 for t in skill.triggers if t.lower() in query_lower)
            if matches:
                scored.append((matches, skill))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:top_k]]

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_skill_file(path: Path) -> Skill:
        text = path.read_text(encoding="utf-8")
        # Extract front-matter between *** ... ***
        fm_match = re.search(r"\*{3}(.*?)\*{3}", text, re.DOTALL)
        if not fm_match:
            raise ValueError(f"No front-matter found in {path}")
        fm = fm_match.group(1)
        name_match = re.search(r"name:\s*(.+)", fm)
        triggers_match = re.search(r"triggers:\s*(\[.+?\])", fm)
        name = name_match.group(1).strip() if name_match else path.parent.name
        triggers: List[str] = []
        if triggers_match:
            triggers = json.loads(triggers_match.group(1))
        body = text[fm_match.end():].strip()
        return Skill(name=name, triggers=triggers, body=body)

    def _build_index(self) -> None:
        """Build a FAISS index over trigger strings (bag-of-chars, simple)."""
        try:
            import numpy as np  # type: ignore
            import faiss  # type: ignore

            skills = list(self._skills.values())
            all_triggers = [" ".join(s.triggers) for s in skills]
            # Simple character-frequency vector (ASCII 32-127, dim=96)
            dim = 96

            def encode(text: str) -> "np.ndarray":
                vec = np.zeros(dim, dtype=np.float32)
                for ch in text.lower():
                    idx = ord(ch) - 32
                    if 0 <= idx < dim:
                        vec[idx] += 1.0
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec /= norm
                return vec

            matrix = np.stack([encode(t) for t in all_triggers])
            index = faiss.IndexFlatIP(dim)
            index.add(matrix)
            self._index = index
            self._index_skills = skills
            _log.info("FAISS index built for %d skills", len(skills))
        except Exception as exc:
            handle(exc, "skills.build_index")
