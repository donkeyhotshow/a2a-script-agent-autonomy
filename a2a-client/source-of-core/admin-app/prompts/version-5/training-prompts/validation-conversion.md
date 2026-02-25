# System Startup Prompt: Training Session - Validation Conversion

**Цель Сессии:**
Специализированное преобразование файлов неизвестного типа в новый формат Instructions, строго следуя логике и примерам из документации и рабочего логин-модуля, если неизвестный шаблон описывает действия на сервере.

**Scope:**
Работать только с файлами в папке `/implement-modules/question-to-user/v5/validations/` которые имеют структуру Validations (не Instructions).

**Обязательные Ресурсы и Стандарты (перечитать перед началом):**
- [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) (Раздел "Instructions Type")
- [`/prompts/version-5/standards/instruction-file-standard.md`](/docs/ui/core-concepts/instruction-file-standard.md) (Стандарт Instructions)
- [`/prompts/version-5/standards/validation-conversion-logic.md`](/docs/ui/core-concepts/validation-conversion-logic.md) (Подробная логика и примеры конвертации Validations)
- [`/prompts/version-5/standards/handling-schema-deviations.md`](/docs/ui/core-concepts/handling-schema-deviations.md) (Правила обработки отклонений и QTU)
- Рабочий пример: [`/implement-modules/login-form/v1/validations/login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json) (Основной источник фактов о рабочей валидации)
- Файлы: [`/app/AiRudeDepot/Processors/InstructionProcessor.php`](/app/AiRudeDepot/Processors/InstructionProcessor.php), [`/app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php`](/app/AiRudeDepot/Processors/InstructionProcessor/DataManipulateHelper.php) (Код процессоров для понимания `condition` и `batch`)
- Чеклисты: [`/implement-modules/question-to-user/v5/FILE_CHECKLIST.md`](/implement-modules/question-to-user/v5/FILE_CHECKLIST.md)

**Правила Работы:**
1.  Перед началом работы с каждой партией файлов (по 5 шт.), перечитать все обязательные ресурсы и стандарты.
2.  Для каждого файла Validations старого формата:
    *   Прочитать файл.
    *   Анализировать структуру `ValidationRules`/`ValidationRuleSet` и типы правил (`required`, `minLength` и т.д.).
    *   Применить логику конвертации из `validation-conversion-logic.md` для преобразования правил в последовательность инструкций `update` с `condition` и `batch`.
    *   Сверять процесс конвертации и результирующую структуру с рабочим примером [`login-validation.json`](/implement-modules/login-form/v1/validations/login-validation.json).
    *   Генерировать JSON в формате Instructions, который полностью воспроизводит логику старых правил валидации.
    *   Предложить изменения для замены старого содержимого файла на сгенерированный JSON в формате Instructions.
    *   Применять изменения, используя минимальные диффы.
    *   Документировать внесенные изменения (включая описание логики конвертации для этого файла) в чеклисте `FILE_CHECKLIST.md`.
    *   Анализировать и документировать **контекст использования** файла (где он вызывается, как передаются данные для валидации, как обрабатываются результаты - `buffer:validationFailed`, `buffer:validationErrors`). Зафиксировать это в чеклисте.
    *   Если обнаружена неясность в логике конвертации для конкретного правила, отсутствующего в документации/примерах:
        *   Четко сформулировать вопрос.
        *   Запросить у пользователя разрешение через QTU, строго по правилам в `handling-schema-deviations.md`.
        *   Не продолжать конвертацию этого правила, пока не получите разъяснение.
3.  После обработки партии из 5 файлов, обновить `FILE_CHECKLIST.md` и перейти к следующей партии, снова перечитав стандарты.
4.  **НИКОГДА не делать предположений о структуре или поведении, если это не подкреплено фактами из стандартов, документации или кода.**
5.  **НИКОГДА не извиняться.** В случае ошибок, признать факт ошибки, скорректировать поведение и документацию/код согласно правилам (ремайндер в `component-structure.md`).
6.  Строго следовать ремайндеру в [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) для всех действий.

**Ожидаемый Результат Сессии:**
Все файлы типа Validations старого формата в модуле `/implement-modules/question-to-user/v5/` успешно конвертированы в формат Instructions, их логика сохранена и задокументирована. Чеклист `FILE_CHECKLIST.md` полностью обновлен для этих файлов.

**Начать работу, прочитав стандарты и взяв первую партию файлов Validations старого формата из папки `validations/`.** 