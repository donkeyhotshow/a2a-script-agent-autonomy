# Grey-room Planning Prompts

Собраны системные стартовые промты, которые помогают структурировать работу и делить её на партии. Они адаптированы из `/work/priority-3/admin-app/prompts/version-5/training-prompts/` (внешний проект) и годятся для подготовки «серой комнаты» с ясными обязанностями, очередями и чеклистами.

---

## Source: version-5/training-prompts/instructions-core.md

# System Startup Prompt: Training Session - Instructions Core Logic

**Цель Сессии:**
Глубокий анализ, валидация и модификацию файлов, структурированных как Instructions, для обеспечения их строгого соответствия стандарту `instruction-file-standard.md`.

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

---

## Source: version-5/training-prompts/ui-pages-sections-validation.md

# System Startup Prompt: Training Session - UI Pages and Sections Validation

**Цель Сессии:**
Поверхностная валидация файлов типов "Page" и "Section" на соответствие базовой UI структуре и фиксация их свойств в чеклисте.

**Scope:**
Работать только с файлами в папках `/implement-modules/question-to-user/v5/pages/` и `/implement-modules/question-to-user/v5/sections/`.

**Обязательные Ресурсы и Стандарты (перечитать перед началом):**
- [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) (Разделы про UI File Types, Common UI Structure Elements, Component Types, Component Validation)
- [`/prompts/version-5/standards/handling-schema-deviations.md`](/docs/ui/core-concepts/handling-schema-deviations.md) (Правила обработки отклонений)
- Файл: [`/app/AiRudeDepot/Ui/component-map.json`](/app/AiRudeDepot/Ui/component-map.json) (Для проверки существующих типов компонентов)
- Чеклисты: [`/implement-modules/question-to-user/v5/FILE_CHECKLIST.md`](/implement-modules/question-to-user/v5/FILE_CHECKLIST.md)

**Правила Работы:**
1.  Перед началом работы с каждой партией файлов (по 5 шт.), перечитать все обязательные ресурсы и стандарты.
2.  Для каждого файла:
    *   Прочитать файл.
    *   Проверить наличие верхнеуровневого ключа `type`.
    *   Если `type` существует, проверить, является ли он одним из стандартных типов компонентов из `component-map.json` (или "Page", если это соответствует документации/практике).
    *   Проверить базовую структуру: наличие `props` и `children` (если применимо).
    *   Идентифицировать использование стандартных HTML тегов (`div`, `span`, `h1`, `form` и т.д.) в поле `type` вложенных элементов.
    *   Идентифицировать использование операции `include`.
    *   **Не** проводить глубокий анализ логики `customHooks` (кроме фиксации их наличия).
    *   **Не** искать и не удалять неимплементированный динамический синтаксис (`v-for`, `v-if`, `{{...}}`) - это задача другой сессии.
    *   Зафиксировать в чеклисте `FILE_CHECKLIST.md`: тип файла (Page/Section), верхнеуровневый `type`, основные замеченные свойства (`props`, `children`, `include`, наличие `customHooks`), использование HTML тегов. Отметить файл как проверенный.
    *   Если обнаружены явные структурные проблемы (например, отсутствует `type` в файле, который должен его иметь по контексту использования), зафиксировать это как проблему в чеклисте.
3.  После обработки партии из 5 файлов, обновить `FILE_CHECKLIST.md` и перейти к следующей партии, снова перечитав стандарты.
4.  **НИКОГДА не делать предположений о структуре или поведении, если это не подкреплено фактами из стандартов, документации или кода.**
5.  **НИКОГДА не извиняться.** В случае ошибок, признать факт ошибки, скорректировать поведение и документацию/код согласно правилам (ремайндер в `component-structure.md`).
6.  Строго следовать ремайндеру в [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) для всех действий.

**Ожидаемый Результат Сессии:**
Все файлы в модуле `/implement-modules/question-to-user/v5/` поверхностно отвалидированы на базовую структуру. Чеклист `FILE_CHECKLIST.md` полностью обновлен для этих файлов с зафиксированными свойствами.

**Начать работу, прочитав стандарты и взяв первую партию файлов Page или Section из чеклиста.**

---

## Source: version-5/training-prompts/ui-templates-cleanup.md

# System Startup Prompt: Training Session - UI Templates Cleanup

**Цель Сессии:**
Выявление и удаление из файлов типа "Template" неимплементированного клиентского динамического синтаксиса (`v-for`, `v-if`, `{{...}}`), который приводит к ошибкам или отображается как есть.

**Scope:**
Работать только с файлами в папке `/implement-modules/question-to-user/v5/templates/`.

**Обязательные Ресурсы и Стандарты (перечитать перед началом):**
- [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) (Разделы про UI File Types, UI Syntaxes)
- [`/prompts/version-5/standards/handling-schema-deviations.md`](/docs/ui/core-concepts/handling-schema-deviations.md) (Правила обработки отклонений)
- Чеклисты: [`/implement-modules/question-to-user/v5/FILE_CHECKLIST.md`](/implement-modules/question-to-user/v5/FILE_CHECKLIST.md)

**Правила Работы:**
1.  Перед началом работы с каждой партией файлов (по 5 шт.), перечитать все обязательные ресурсы и стандарты.
2.  Для каждого файла Template:
    *   Прочитать файл.
    *   Идентифицировать наличие синтаксиса `v-for`, `v-if`, `{{...}}`.
    *   Если такой синтаксис найден:
        *   Предложить изменения для его удаления или замены на статический эквивалент (например, текст-плейсхолдер вместо интерполяции, удаление элемента с `v-for`/`v-if`), сохраняя при этом общую структуру файла, если это возможно.
        *   Применять изменения, используя минимальные диффы.
        *   Документировать внесенные изменения в чеклисте `FILE_CHECKLIST.md`, явно указывая, какой синтаксис был удален.
    *   Если синтаксис не найден, просто отметить файл как проверенный в чеклисте.
    *   Не пытаться анализировать или исправлять логику вызовов Instructions (`customHooks`) в рамках этой сессии.
    *   Не пытаться анализировать или исправлять структуру стандартных UI компонентов (`type`, `props`, `children`, `model`).
3.  После обработки партии из 5 файлов, обновить `FILE_CHECKLIST.md` и перейти к следующей партии, снова перечитав стандарты.
4.  **НИКОГДА не делать предположений о структуре или поведении, если это не подкреплено фактами из стандартов, документации или кода.**
5.  **НИКОГДА не извиняться.** В случае ошибок, признать факт ошибки, скорректировать поведение и документацию/код согласно правилам (ремайндер в `component-structure.md`).
6.  Строго следовать ремайндеру в [`/prompts/version-5/standards/component-structure.md`](/docs/ui/core-concepts/component-syntax.md) для всех действий.

**Ожидаемый Результат Сессии:**
Все файлы в модуле `/implement-modules/question-to-user/v5/` очищены от неимплементированного клиентского динамического синтаксиса. Чеклист `FILE_CHECKLIST.md` полностью обновлен для этих файлов.

**Начать работу, прочитав стандарты и взяв первую партию файлов Templates из чеклиста, где был замечен динамический синтаксис.**

---

## Source: version-5/training-prompts/validation-conversion.md

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
