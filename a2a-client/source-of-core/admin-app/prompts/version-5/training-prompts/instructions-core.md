# System Startup Prompt: Training Session - Instructions Core Logic

**Цель Сессии:**
Глубокий анализ, валидация и модификация файлов, структурированных как Instructions, для обеспечения их строгого соответствия стандарту `instruction-file-standard.md`.

**Scope:**
Работать только с файлами, которые идентифицированы как Instructions по структуре (`type: "Instructions"` или массив инструкций) в модуле `/implement-modules/question-to-user/v5/`. Включая файлы в `/actions/`, `/commands/`, и `/validations/` (если они уже в формате Instructions).

**Обязательные Ресурсы и Стандарты (перечитать перед началом):**
- [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) (Раздел "Instructions Type")
- [`/prompts/version-5/standards/instruction-file-standard.md`](/docs/ui/core-concepts/instruction-file-standard.md) (Основной стандарт Instructions)
- [`/prompts/version-5/standards/low-level-storage.md`](/docs/ui/core-concepts/low-level-storage.md) (Адреса и взаимодействие с хранилищем)
- [`/prompts/version-5/standards/handling-schema-deviations.md`](/docs/ui/core-concepts/handling-schema-deviations.md) (Правила обработки отклонений и QTU)
- Файлы: [`/app/AiRudeDepot/Processors/InstructionProcessor.php`](/app/AiRudeDepot/Processors/InstructionProcessor.php), [`/app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php`](/app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php) (Код процессоров для понимания реальной логики)
- Рабочий пример: [`/implement-modules/login-form/v1/validations/login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json) (Для сверки структуры и логики)
- Чеклисты: [`/implement-modules/question-to-user/v5/FILE_CHECKLIST.md`](/implement-modules/question-to-user/v5/FILE_CHECKLIST.md)

**Правила Работы:**
1.  Перед началом работы с каждой партией файлов (по 5 шт.), перечитать все обязательные ресурсы и стандарты.
2.  Для каждого файла Instructions:
    *   Прочитать файл.
    *   Проверить структуру, действия, адреса, условия, batch-операции на строгое соответствие `instruction-file-standard.md`.
    *   Анализировать и документировать **контекст использования** файла (где он вызывается, как передаются данные, как используются результаты). Зафиксировать это в чеклисте `FILE_CHECKLIST.md` и, при необходимости, в самом файле (комментариями, если уместно и не нарушает структуру).
    *   Сверять логику с рабочим примером [`login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json) и кодом процессоров.
    *   Если найдены отклонения от стандарта или логические ошибки:
        *   Зафиксировать отклонение.
        *   Предложить точные изменения для приведения файла в соответствие со стандартом.
        *   Применять изменения, используя минимальные диффы.
        *   Документировать внесенные изменения в чеклисте.
    *   Если обнаружена неясность в документации или коде, которая не позволяет принять решение (например, по использованию адреса `file!` или конкретного действия):
        *   Четко сформулировать, какая информация отсутствует или вызывает сомнения.
        *   Запросить у пользователя разрешение вопроса через систему QTU, строго по правилам в `handling-schema-deviations.md` (QTU только для связей и использования, а не для структуры Инструкций).
        *   Не продолжать работу над этим аспектом, пока не получите разъяснение.
3.  После обработки партии из 5 файлов, обновить `FILE_CHECKLIST.md` (отметить проверенные файлы, зафиксировать найденные проблемы и внесенные изменения) и перейти к следующей партии, снова перечитав стандарты.
4.  **НИКОГДА не делать предположений о структуре или поведении, если это не подкреплено фактами из стандартов, документации или кода.**
5.  **НИКОГДА не извиняться.** В случае ошибок, признать факт ошибки, скорректировать поведение и документацию/код согласно правилам (ремайндер в `component-structure.md`).
6.  Строго следовать ремайндеру в [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) для всех действий.

**Ожидаемый Результат Сессии:**
Все файлы типа Instructions в модуле `/implement-modules/question-to-user/v5/` проверены, отвалидированы и приведены в максимальное соответствие стандарту `instruction-file-standard.md` на основе имеющихся фактов и рабочего примера. Чеклист `FILE_CHECKLIST.md` полностью обновлен для этих файлов. Потенциальные вопросы или области неясности зафиксированы или переданы через QTU (если разрешено стандартом).

**Начать работу, прочитав стандарты и взяв первую партию файлов Instructions из чеклиста.** 