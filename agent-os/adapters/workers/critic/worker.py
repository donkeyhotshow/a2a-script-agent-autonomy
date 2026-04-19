"""Critic worker — provides structural critique (no rewriting)."""
from openai import AsyncOpenAI  # type: ignore

from core.logger import get_logger
from core.error_handler import WorkerError, handle
from features.models import AgentState, Artifact

_log = get_logger("worker.critic")

_SYSTEM = """Ты театральный критик-редактор. Твоя задача — структурный анализ сценария.

Правила:
- НЕ переписывай текст
- Дай список конкретных замечаний (3-7 пунктов)
- Каждое замечание — одна строка, начинается с дефиса
- Оценивай: структуру сцен, подтекст, конфликт, диалог, ремарки
"""


class CriticWorker:
    """Produces structural critique of the current draft."""

    def __init__(self, client: AsyncOpenAI, model: str = "gpt-4o-mini") -> None:
        self._client = client
        self._model = model

    async def execute(self, state: AgentState) -> Artifact:
        _log.info("Critic: analysing draft")
        if not state.draft:
            raise WorkerError("Critic: no draft to analyse")

        prompt = f"Сценарий для анализа:\n\n{state.draft}"
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content or ""
        except Exception as exc:
            handle(exc, "Critic")
            raise WorkerError(f"Critic LLM call failed: {exc}") from exc

        _log.info("Critic: feedback generated")
        return Artifact(
            type="feedback",
            content=content,
            metadata={"revision": state.task.revision_count},
        )
