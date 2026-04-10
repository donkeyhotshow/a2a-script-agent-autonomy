"""
Prospective Reflection System v2.0

Источник: PreFlect — "от ретроспективы к проспективной рефлексии в агентах
большой языковой модели"

Принцип:
  Агент прогнозирует возможные ошибки ДО их совершения и составляет
  "инструкцию по безопасности" для себя.

Методология:
  1. Формулируем 3 сценария провала
  2. Пишем "Инструкцию по безопасности" для себя
  3. Реализуем задачу, строго следуя инструкции
  4. Оцениваем свою работу (1-10)
"""

import json, re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Пути ──────────────────────────────────────────────────────────────────
_BASE = Path(__file__).parent if '__file__' in dir() else Path(".")
_PROSPECTIVE_DIR = _BASE / "prospective_reflections"
_PROSPECTIVE_DIR.mkdir(parents=True, exist_ok=True)

SAFETY_PROMPT_PATH = _PROSPECTIVE_DIR / "active_safety_instructions.json"
REFLECTION_LOG_PATH = _PROSPECTIVE_DIR / "reflection_log.jsonl"
PERFORMANCE_HISTORY_PATH = _PROSPECTIVE_DIR / "performance_history.json"

_MAX_SCENARIOS = 3
_MAX_INSTRUCTIONS = 5


# ── Основной класс ─────────────────────────────────────────────────────────
class ProspectiveReflection:
    """
    Система проспективной рефлексии.
    Используется перед выполнением каждой задачи.
    """

    def __init__(self):
        self._ensure_files()

    def _ensure_files(self):
        """Инициализация файлов."""
        if not SAFETY_PROMPT_PATH.exists():
            SAFETY_PROMPT_PATH.write_text(json.dumps({"instructions": [], "last_updated": None}, indent=2))
        if not REFLECTION_LOG_PATH.exists():
            REFLECTION_LOG_PATH.write_text("")
        if not PERFORMANCE_HISTORY_PATH.exists():
            PERFORMANCE_HISTORY_PATH.write_text(json.dumps({"entries": []}))

    def generate_safety_instructions(self, task: str) -> dict:
        """
        Генерирует инструкции по безопасности на основе анализа задачи.

        Возвращает:
          {
            "task": "описание задачи",
            "failure_scenarios": [
              {"scenario": "...", "likelihood": 0.0-1.0, "severity": 0.0-1.0}
            ],
            "safety_instructions": [
              "Инструкция 1",
              "Инструкция 2"
            ],
            "checkpoints": ["точка проверки 1", ...]
          }
        """
        # Анализируем задачу на потенциальные проблемы
        failure_scenarios = self._identify_failure_scenarios(task)
        safety_instructions = self._generate_safety_instructions(task, failure_scenarios)
        checkpoints = self._identify_checkpoints(task)

        return {
            "task": task,
            "failure_scenarios": failure_scenarios,
            "safety_instructions": safety_instructions,
            "checkpoints": checkpoints,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _identify_failure_scenarios(self, task: str) -> list[dict]:
        """Идентифицирует потенциальные сценарии провала."""
        scenarios = []
        lower_task = task.lower()

        # Паттерны для анализа рисков
        risk_patterns = [
            # Конфиденциальность и безопасность
            {
                "pattern": r"(password|secret|key|token|credential)",
                "scenario": "Раскрытие конфиденциальных данных (пароли, ключи, токены)",
                "likelihood_base": 0.6,
                "severity_base": 0.9,
            },
            # Потеря данных
            {
                "pattern": r"(delete|drop|remove|truncate|clear)",
                "scenario": "Случайное удаление важных данных или файлов",
                "likelihood_base": 0.5,
                "severity_base": 0.95,
            },
            # Файловая система
            {
                "pattern": r"(file|path|directory|folder)",
                "scenario": "Ошибка в работе с файловой системой (неверный путь, права доступа)",
                "likelihood_base": 0.4,
                "severity_base": 0.7,
            },
            # Базы данных
            {
                "pattern": r"(database|sql|query|migration)",
                "scenario": "Ошибка в SQL запросе или миграции базы данных",
                "likelihood_base": 0.45,
                "severity_base": 0.85,
            },
            # API и сети
            {
                "pattern": r"(api|http|request|endpoint|url)",
                "scenario": "Неверный API вызов или проблемы с сетью",
                "likelihood_base": 0.35,
                "severity_base": 0.6,
            },
            # Код и компиляция
            {
                "pattern": r"(code|function|class|compile|build|test)",
                "scenario": "Ошибка в коде (синтаксическая, логическая, runtime)",
                "likelihood_base": 0.5,
                "severity_base": 0.65,
            },
            # Конфигурация
            {
                "pattern": r"(config|setting|env|variable)",
                "scenario": "Неправильная конфигурация (переменные окружения, настройки)",
                "likelihood_base": 0.4,
                "severity_base": 0.7,
            },
            # Развёртывание
            {
                "pattern": r"(deploy|production|release|publish)",
                "scenario": "Проблема при развёртывании (несовместимость, downtime)",
                "likelihood_base": 0.35,
                "severity_base": 0.8,
            },
        ]

        matched_patterns = []
        for rp in risk_patterns:
            if re.search(rp["pattern"], lower_task, re.IGNORECASE):
                matched_patterns.append(rp)

        # Генерируем до MAX_SCENARIOS сценариев
        for rp in matched_patterns[:_MAX_SCENARIOS]:
            likelihood = min(1.0, rp["likelihood_base"] + 0.1)
            severity = rp["severity_base"]
            scenarios.append({
                "scenario": rp["scenario"],
                "likelihood": likelihood,
                "severity": severity,
                "risk_score": likelihood * severity,
            })

        # Если не нашли паттернов, добавляем общий сценарий
        if not scenarios:
            scenarios.append({
                "scenario": "Общая ошибка выполнения задачи",
                "likelihood": 0.3,
                "severity": 0.5,
                "risk_score": 0.15,
            })

        # Сортируем по risk_score
        scenarios.sort(key=lambda x: x["risk_score"], reverse=True)
        return scenarios[:_MAX_SCENARIOS]

    def _generate_safety_instructions(self, task: str, scenarios: list[dict]) -> list[str]:
        """Генерирует инструкции по безопасности на основе сценариев."""
        instructions = []

        # Базовые инструкции
        instructions.append("Перед началом работы проверить доступность всех необходимых ресурсов")
        instructions.append("Сохранять резервные копии перед изменением данных")
        instructions.append("Использовать итеративный подход: малые изменения с проверкой")

        # Генерируем специфичные инструкции
        for scenario in scenarios[:2]:  # Берём топ-2 сценария
            scenario_lower = scenario["scenario"].lower()

            if "конфиденциальных данных" in scenario_lower:
                instructions.append("Маскировать секреты в логах и выводах (использовать ***)")
                instructions.append("Не выводить пароли/ключи в ответах")

            if "удаление" in scenario_lower or "данных" in scenario_lower:
                instructions.append("Создавать backup перед любой операцией удаления")
                instructions.append("Подтверждать операции удаления с пользователем")

            if "файлов" in scenario_lower or "файловой системе" in scenario_lower:
                instructions.append("Проверять существование файла/директории перед операцией")
                instructions.append("Проверять права доступа к файлам")

            if "базе данных" in scenario_lower or "sql" in scenario_lower:
                instructions.append("Использовать транзакции для изменения данных")
                instructions.append("Проверять SQL синтаксис перед выполнением")

            if "код" in scenario_lower or "компиляц" in scenario_lower:
                instructions.append("Тестировать код на синтаксические ошибки")
                instructions.append("Проверять граничные случаи")

            if "конфигурац" in scenario_lower:
                instructions.append("Документировать все изменения конфигурации")
                instructions.append("Валидировать конфигурацию перед применением")

            if "развёртывани" in scenario_lower:
                instructions.append("Тестировать на staging/dev окружении перед prod")
                instructions.append("Подготовить план отката (rollback)")

        return instructions[:_MAX_INSTRUCTIONS]

    def _identify_checkpoints(self, task: str) -> list[str]:
        """Идентифицирует контрольные точки для проверки."""
        checkpoints = []

        # Общие чекпоинты
        checkpoints.append("После каждого изменения — проверка что оно работает")
        checkpoints.append("Финальная проверка результата перед возвратом пользователю")

        lower_task = task.lower()

        # Специфичные чекпоинты
        if any(kw in lower_task for kw in ["file", "write", "create"]):
            checkpoints.append("Проверка что файл создан/изменён корректно")

        if any(kw in lower_task for kw in ["test", "verify"]):
            checkpoints.append("Все тесты проходят успешно")

        if any(kw in lower_task for kw in ["api", "request"]):
            checkpoints.append("API возвращает ожидаемый статус и формат")

        if any(kw in lower_task for kw in ["code", "function", "class"]):
            checkpoints.append("Код компилируется без ошибок")

        return checkpoints[:5]

    def save_instructions(self, instructions: dict):
        """Сохраняет инструкции как активные для текущей сессии."""
        data = json.loads(SAFETY_PROMPT_PATH.read_text())
        data["instructions"] = instructions.get("safety_instructions", [])
        data["last_updated"] = datetime.now(timezone.utc).isoformat()
        data["current_task"] = instructions.get("task", "")[:200]
        SAFETY_PROMPT_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        print(f"[prospective] Saved safety instructions for task: {instructions.get('task', '')[:50]}...")

    def get_active_instructions(self) -> dict:
        """Получает активные инструкции по безопасности."""
        try:
            return json.loads(SAFETY_PROMPT_PATH.read_text())
        except Exception:
            return {"instructions": [], "last_updated": None}

    def evaluate_performance(self, task: str, safety_instructions: list[str], success: bool) -> dict:
        """
        Оценивает производительность агента.

        Args:
            task: Описание задачи
            safety_instructions: Использовавшиеся инструкции
            success: Успешно ли выполнена задача

        Returns:
            Оценка (1-10) и комментарий
        """
        score = 7  # Базовая оценка

        if success:
            score += 2
        else:
            score -= 3

        # Проверяем соблюдение инструкций
        if len(safety_instructions) >= 3:
            score += 1

        # Оцениваем риск задачи
        risk_keywords = ["delete", "deploy", "production", "database", "password"]
        has_high_risk = any(kw in task.lower() for kw in risk_keywords)
        if has_high_risk and success:
            score += 1  # Бонус за успех в рисковой задаче
        elif has_high_risk and not success:
            score -= 1  # Штраф за провал в рисковой задаче

        score = max(1, min(10, score))  # Ограничиваем 1-10

        comment = self._generate_comment(score, success, len(safety_instructions))

        return {
            "task": task[:200],
            "score": score,
            "comment": comment,
            "instructions_followed": len(safety_instructions),
            "success": success,
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _generate_comment(self, score: int, success: bool, instructions_count: int) -> str:
        """Генерирует комментарий к оценке."""
        if score >= 9:
            return "Отличная работа! Все инструкции соблюдены, задача выполнена успешно."
        elif score >= 7:
            return "Хорошая работа. Задача выполнена с небольшими замечаниями."
        elif score >= 5:
            return "Удовлетворительно. Есть возможности для улучшения."
        elif score >= 3:
            return "Неудовлетворительно. Требуется доработка."
        else:
            return "Критическая ошибка. Необходим разбор полётов."

    def log_reflection(self, evaluation: dict):
        """Логирует результат рефлексии."""
        with open(REFLECTION_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(evaluation, ensure_ascii=False) + "\n")

        # Обновляем историю производительности
        history = json.loads(PERFORMANCE_HISTORY_PATH.read_text())
        history["entries"].append(evaluation)
        # Храним только последние 100 записей
        history["entries"] = history["entries"][-100:]
        PERFORMANCE_HISTORY_PATH.write_text(json.dumps(history, indent=2))

    def get_performance_summary(self) -> dict:
        """Получает сводку производительности."""
        try:
            history = json.loads(PERFORMANCE_HISTORY_PATH.read_text())
            entries = history.get("entries", [])

            if not entries:
                return {"avg_score": 0, "total_tasks": 0, "success_rate": 0}

            scores = [e["score"] for e in entries]
            successes = sum(1 for e in entries if e.get("success"))

            return {
                "avg_score": sum(scores) / len(scores) if scores else 0,
                "total_tasks": len(entries),
                "success_rate": successes / len(entries) if entries else 0,
                "last_5_avg": sum(scores[-5:]) / min(5, len(scores)) if scores else 0,
            }
        except Exception:
            return {"avg_score": 0, "total_tasks": 0, "success_rate": 0}


# ── Глобальный экземпляр ───────────────────────────────────────────────────
_prospective_instance: Optional[ProspectiveReflection] = None


def get_prospective() -> ProspectiveReflection:
    """Получить глобальный экземпляр системы проспективной рефлексии."""
    global _prospective_instance
    if _prospective_instance is None:
        _prospective_instance = ProspectiveReflection()
    return _prospective_instance


def generate_and_save_instructions(task: str) -> dict:
    """Удобная функция для генерации и сохранения инструкций."""
    pr = get_prospective()
    instructions = pr.generate_safety_instructions(task)
    pr.save_instructions(instructions)
    return instructions


def evaluate_and_log(task: str, safety_instructions: list[str], success: bool) -> dict:
    """Удобная функция для оценки и логирования."""
    pr = get_prospective()
    evaluation = pr.evaluate_performance(task, safety_instructions, success)
    pr.log_reflection(evaluation)
    return evaluation
