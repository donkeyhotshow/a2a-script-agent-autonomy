"""Judge worker — returns numeric score 0-10 with reason."""
import json
import re

from openai import AsyncOpenAI  # type: ignore

from core.logger import get_logger
from core.error_handler import WorkerError, handle
from features.models import AgentState, Artifact

_log = get_logger("worker.judge")

_SYSTEM = """Ты строгий литературный судья. Оцени театральный сценарий по шкале 0-10.

Критерии:
- Драматическое напряжение (0-3)
- Качество диалога (0-3)
- Структура и темп (0-2)
- Подтекст и глубина (0-2)

Ответь строго в формате JSON:
{"score": <число 0-10>, "reason": "<одно предложение>"}
"""


class JudgeWorker:
    """Scores the current draft. Returns JSON artifact with score and reason."""

    def __init__(self, client: AsyncOpenAI, model: str = "gpt-4o-mini") -> None:
        self._client = client
        self._model = model

    async def execute(self, state: AgentState) -> Artifact:
        _log.info("Judge: scoring draft")
        if not state.draft:
            raise WorkerError("Judge: no draft to score")

        prompt = f"Сценарий для оценки:\n\n{state.draft}"
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content or "{}"
            data = json.loads(raw)
        except Exception as exc:
            handle(exc, "Judge")
            raise WorkerError(f"Judge LLM call failed: {exc}") from exc

        score = float(data.get("score", 0.0))
        reason = data.get("reason", "")
        _log.info("Judge: score=%.1f — %s", score, reason)
        return Artifact(
            type="score",
            content=json.dumps({"score": score, "reason": reason}, ensure_ascii=False),
            metadata={"score": score, "revision": state.task.revision_count},
        )
