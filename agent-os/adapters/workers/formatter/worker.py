"""Formatter worker — produces final human-readable script."""
from openai import AsyncOpenAI  # type: ignore

from core.logger import get_logger
from core.error_handler import WorkerError, handle
from features.models import AgentState, Artifact

_log = get_logger("worker.formatter")

_SYSTEM = """Ты технический редактор театральных текстов.
Задача: отформатировать черновик сценария в финальный читаемый вид.

Правила форматирования:
- Имена персонажей — ЗАГЛАВНЫМИ БУКВАМИ
- Ремарки — (в скобках, курсивом не нужно)
- Чёткое разделение реплик пустой строкой
- Добавь заголовок сцены если его нет
- НЕ меняй содержание, только форматирование
"""


class FormatterWorker:
    """Formats the final draft into a publishable script."""

    def __init__(self, client: AsyncOpenAI, model: str = "gpt-4o-mini") -> None:
        self._client = client
        self._model = model

    async def execute(self, state: AgentState) -> Artifact:
        _log.info("Formatter: formatting final draft")
        if not state.draft:
            raise WorkerError("Formatter: no draft to format")

        prompt = f"Отформатируй сценарий:\n\n{state.draft}"
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
            )
            content = response.choices[0].message.content or state.draft
        except Exception as exc:
            handle(exc, "Formatter")
            raise WorkerError(f"Formatter LLM call failed: {exc}") from exc

        _log.info("Formatter: done (%d chars)", len(content))
        return Artifact(
            type="formatted",
            content=content,
            metadata={"score": state.judge_score},
        )
