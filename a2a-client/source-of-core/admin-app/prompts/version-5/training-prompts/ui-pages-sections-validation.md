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