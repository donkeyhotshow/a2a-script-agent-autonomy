"""ScriptWriter worker — generates theatrical script using LLM."""
import asyncio
from typing import Optional

from openai import AsyncOpenAI  # type: ignore

from core.logger import get_logger
from core.error_handler import WorkerError, handle
from features.models import AgentState, Artifact

_log = get_logger("worker.script_writer")


class ScriptWriterWorker:
    """Generates a scene/monologue draft.

    Uses:
    - skill body (rules)
    - behaviour (system prompt injection)
    - previous draft (if revision)
    - similar solutions (context)
    """

    def __init__(self, client: AsyncOpenAI, model: str = "gpt-4o-mini") -> None:
        self._client = client
        self._model = model

    async def execute(self, state: AgentState) -> Artifact:
        _log.info("ScriptWriter: generating draft (revision=%d)", state.task.revision_count)

        system_prompt = self._build_system_prompt(state)
        user_prompt = self._build_user_prompt(state)

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.8,
            )
            content = response.choices[0].message.content or ""
        except Exception as exc:
            handle(exc, "ScriptWriter")
            raise WorkerError(f"ScriptWriter LLM call failed: {exc}") from exc

        _log.info("ScriptWriter: draft generated (%d chars)", len(content))
        return Artifact(
            type="script",
            content=content,
            metadata={"revision": state.task.revision_count},
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system_prompt(self, state: AgentState) -> str:
        parts = [
            "Ты опытный театральный драматург. Пиши на русском языке.",
        ]
        if state.behaviour:
            parts.append(f"\n# Поведение\n{state.behaviour}")
        # Inject skill rules
        skill_context = state.task.blackboard.get("skill_body", "")
        if skill_context:
            parts.append(f"\n# Правила жанра\n{skill_context}")
        return "\n".join(parts)

    def _build_user_prompt(self, state: AgentState) -> str:
        lines = [f"Задача: {state.task.goal}"]

        # Revision context
        if state.task.revision_count > 0 and state.draft:
            lines.append(f"\n# Предыдущий черновик\n{state.draft}")
            if state.critic_notes:
                notes = "\n".join(f"- {n}" for n in state.critic_notes)
                lines.append(f"\n# Замечания критика\n{notes}")
            lines.append("\nУчти замечания и улучши сценарий.")
        else:
            # First generation — inject similar solutions as inspiration
            if state.similar_solutions:
                lines.append("\n# Похожие успешные решения (для вдохновения, не копировать)")
                for sol in state.similar_solutions[:2]:
                    lines.append(f"---\n{sol.get('draft', '')[:300]}")

        lines.append("\nНапиши законченный театральный сценарий.")
        return "\n".join(lines)
