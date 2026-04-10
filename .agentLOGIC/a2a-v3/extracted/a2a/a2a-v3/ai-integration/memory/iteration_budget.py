"""
Iteration Budget — контроль итераций агентного цикла.

Источник: hermes-agent (NousResearch)
  - max 90 итераций на корневой агент
  - бюджет общий для всей цепочки включая subagents
  - при достижении лимита — принудительное завершение с отчётом

Назначение в a2a-v3:
  Предотвращает бесконечное зависание reasoning.py при:
    - циклических ошибках (retry loop)
    - застрявшем Gray Room
    - бесконечном idle-discover без прогресса
"""

import os, time, threading, json
from pathlib import Path

_DEFAULT_MAX   = int(os.getenv("AGENT_ITER_BUDGET", "90"))
_WARN_AT       = 0.8   # предупреждение при использовании 80% бюджета
_BUDGET_DIR    = Path(os.getenv("MEMORY_DIR", Path(__file__).parent / "store"))
_BUDGET_DIR.mkdir(parents=True, exist_ok=True)


class IterationBudget:
    """
    Thread-safe счётчик итераций для одной агентной сессии.

    Использование:
        budget = IterationBudget(session_id="abc123", max_iterations=90)

        # В начале каждого хода reasoning:
        ok, status = budget.tick()
        if not ok:
            return budget.forced_stop_response()

        # При делегировании subagent'у:
        sub_budget = budget.delegate(max_sub_iterations=20)
    """

    def __init__(self, session_id: str, max_iterations: int = _DEFAULT_MAX, parent: "IterationBudget | None" = None):
        self.session_id     = session_id
        self.max_iterations = max_iterations
        self.parent         = parent
        self._count         = 0
        self._start_time    = time.time()
        self._lock          = threading.Lock()
        self._warned        = False
        self._history: list[dict] = []   # краткая история ходов для отчёта

    @property
    def remaining(self) -> int:
        return max(0, self.max_iterations - self._count)

    @property
    def used(self) -> int:
        return self._count

    @property
    def elapsed_seconds(self) -> float:
        return round(time.time() - self._start_time, 1)

    def tick(self, action: str = "", note: str = "") -> tuple[bool, str]:
        """
        Регистрирует один ход. Возвращает (ok, status_message).
        ok=False означает: бюджет исчерпан, агент должен остановиться.
        """
        # Пробрасываем в родительский бюджет (subagent chain)
        if self.parent:
            ok, msg = self.parent.tick(action=f"[sub] {action}", note=note)
            if not ok:
                return False, msg

        with self._lock:
            self._count += 1
            if action or note:
                self._history.append({
                    "n": self._count,
                    "action": action[:60],
                    "note": note[:80],
                })

            pct = self._count / self.max_iterations

            # Предупреждение при 80%
            if pct >= _WARN_AT and not self._warned:
                self._warned = True
                print(
                    f"[budget] ⚠ session={self.session_id} "
                    f"used {self._count}/{self.max_iterations} iterations "
                    f"({int(pct*100)}%) — approaching limit"
                )

            # Лимит исчерпан
            if self._count >= self.max_iterations:
                return False, self._limit_message()

        return True, f"iter={self._count}/{self.max_iterations}"

    def _limit_message(self) -> str:
        last_actions = [h["action"] for h in self._history[-5:]]
        return (
            f"ITERATION_BUDGET_EXCEEDED: {self._count}/{self.max_iterations} iterations used "
            f"in {self.elapsed_seconds}s. "
            f"Last actions: {last_actions}. "
            f"Agent must stop, summarize, and write remaining work to tasks/pending/."
        )

    def forced_stop_response(self) -> dict:
        """
        Возвращает structured response для возврата из reasoning,
        когда бюджет исчерпан. Агент должен записать незаконченную работу.
        """
        return {
            "execute": {
                "budget_stop": {
                    "session_id":     self.session_id,
                    "iterations_used": self._count,
                    "elapsed_seconds": self.elapsed_seconds,
                    "instruction": (
                        "Budget exhausted. "
                        "Write a summary of completed work and remaining tasks "
                        "to tasks/pending/ before stopping. "
                        "Do NOT loop again."
                    ),
                }
            },
            "meta": {
                "thought": f"Iteration budget exhausted: {self._count}/{self.max_iterations}",
                "post":    "Forced stop — writing state to tasks/pending/",
            }
        }

    def delegate(self, max_sub_iterations: int = 20) -> "IterationBudget":
        """
        Создаёт дочерний бюджет для subagent-а.
        Дочерний бюджет также уменьшает родительский счётчик.
        """
        sub = IterationBudget(
            session_id=f"{self.session_id}:sub",
            max_iterations=min(max_sub_iterations, self.remaining),
            parent=self
        )
        return sub

    def snapshot(self) -> dict:
        """Для сохранения состояния между ходами (если нужно персистировать)."""
        return {
            "session_id":     self.session_id,
            "used":           self._count,
            "max_iterations": self.max_iterations,
            "elapsed":        self.elapsed_seconds,
            "warned":         self._warned,
        }

    def save(self):
        """Сохраняет снапшот в store/ — полезно при долгих сессиях."""
        path = _BUDGET_DIR / f"budget_{self.session_id}.json"
        path.write_text(json.dumps(self.snapshot(), indent=2), encoding="utf-8")

    @classmethod
    def load_or_create(cls, session_id: str, max_iterations: int = _DEFAULT_MAX) -> "IterationBudget":
        """
        Восстанавливает бюджет из store/ или создаёт новый.
        Используется при возобновлении прерванной сессии.
        """
        path = _BUDGET_DIR / f"budget_{session_id}.json"
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                b = cls(session_id=session_id, max_iterations=data["max_iterations"])
                b._count   = data["used"]
                b._warned  = data["warned"]
                remaining  = b.remaining
                print(f"[budget] restored session={session_id}: {b._count}/{b.max_iterations} used, {remaining} remaining")
                return b
            except Exception as e:
                print(f"[budget] restore failed ({e}), creating fresh")
        return cls(session_id=session_id, max_iterations=max_iterations)
