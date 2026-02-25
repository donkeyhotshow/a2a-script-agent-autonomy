# Чеклист проверки файлов модуля question-to-user v5

## Actions
- [x] [clear-current-answers.json](CHECKLIST.md#1-actions-действия)
- [x] [execute-main-work-scenario.json](CHECKLIST.md#1-actions-действия)
- [x] [get-next-ai-probe-question.json](CHECKLIST.md#1-actions-действия)
- [x] [list-dialog-definitions.json](CHECKLIST.md#1-actions-действия)
- [x] [list-system-scenarios.json](CHECKLIST.md#1-actions-действия)
- [x] [list-system-tasks.json](CHECKLIST.md#1-actions-действия)
- [x] [load-ai-probe-questions.json](CHECKLIST.md#1-actions-действия)
- [x] [load-demo-form.json](CHECKLIST.md#1-actions-действия)
- [x] [load-dialog-definition.json](CHECKLIST.md#1-actions-действия)
- [x] [load-question-set.json](CHECKLIST.md#1-actions-действия)
- [x] [load-question-summary-table.json](CHECKLIST.md#1-actions-действия)
- [x] [populate-demo-form.json](CHECKLIST.md#1-actions-действия)
- [x] [process-questions.json](CHECKLIST.md#1-actions-действия)
- [x] [reset-main-work-scenario.json](CHECKLIST.md#1-actions-действия)
- [x] [save-ai-probe-answers.json](CHECKLIST.md#1-actions-действия)
- [x] [save-current-answers.json](CHECKLIST.md#1-actions-действия)
- [x] [save-demo-form.json](CHECKLIST.md#1-actions-действия)
- [x] [submit-manual-response.json](CHECKLIST.md#1-actions-действия)
- [x] [submit-task.json](CHECKLIST.md#1-actions-действия)

## Pages
- [x] [ai-specific-dialogs-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard. Removed outdated comment.
- [x] [dialogs-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard.
- [x] [dynamic-form-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard. Transformation 'parse' needs verification.
- [x] [form-demo-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard.
- [x] [page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard.
- [x] [question-summary-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct, uses generic HTML tag h2. Page type needs documentation in standard.
- [x] [task-overview.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard.
- [x] [task-scenario-management-page.json](CHECKLIST.md#3-pages-страницы) - Structure appears correct. Page type needs documentation in standard.

## Sections
- [x] [main-qtu-interface.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container. Uses generic HTML tags and 'include' operation. Section type needs documentation. HTML tags and 'include' operation need documentation.
- [x] [module-header.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container. Uses generic HTML tag h1 and 'navigateTo' action. Section type, HTML tags, and navigateTo action need documentation.
- [x] [qtu-content-display-section.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container ('div'). Uses standard components (div, Span) and prop binding. Structure appears correct.
- [x] [qtu-suggestions-section.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container ('div'). Uses standard HTML tags (h4, div) and component (Span), and prop binding. Structure appears correct.
- [x] [qtu-user-input-section.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container ('div'). Uses standard components (form, div, span, InputText, Textarea, Button), HTML tags, and model binding. Structure appears correct.
- [x] [question-display.json](CHECKLIST.md#4-sections-секции) - Structure is a component/container ('div'). Uses standard HTML tags (h2, div, h3, label, textarea) and component (button), prop binding, and model binding. Calls Instructions files via customHooks (get-next-ai-probe-question.json, load-ai-probe-questions.json, submit-manual-response.json). Section type and use of standard HTML tags need documentation.

## Templates
- [x] [command-execution-form.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('form'). Uses standard HTML tags and components (button, select, input, textarea, etc.), prop binding, and model binding (including options). Calls Instructions files via customHooks. Template type and use of standard HTML tags/model options need documentation.
- [x] [generated-question-summary-table.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('div'). Uses standard HTML tags (div, p), prop binding, and children. **Uses dynamic rendering syntax: v-for, v-if, and {{...}} interpolation.** Calls Instructions files via customHooks. Template type, use of standard HTML tags, and dynamic rendering syntax need documentation.
- [x] [layouts/qtu-dialog-layout.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('div'). Uses standard HTML tags (div, h2), prop binding (class, style), and children. **Uses complex interpolation syntax ({{slotProps.header.title?|AI Assistant}}).** Template type, use of standard HTML tags/style prop, complex interpolation syntax, and the concept of slots need documentation.
- [x] [question-area.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('div'). Uses standard HTML tags (div, span, input, select, label), prop binding, model binding (field, default, static options), and children. Template type, use of standard HTML tags, and model binding details need documentation.
- [x] [scenario-list-display.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('div'). Uses standard HTML tags (div, h3, button, span), prop binding, and children. Calls an Instructions file via customHooks (list-system-scenarios.json). Template type and use of standard HTML tags need documentation.
- [x] [task-form.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('Form'). Uses components from component-map.json (InputText, Textarea, Dropdown, Button), prop binding, and model binding. **Uses 'vAddress' for binding to storage addresses.** Calls Instructions files via customHooks. Template type, use of vAddress, and model binding details need documentation.
- [x] [task-list-display.json](CHECKLIST.md#5-templates-шаблоны) - Structure is a component/container ('div'). Uses standard HTML tags (div, h3, button, span, table, thead, tbody, tr, th, td), prop binding, and children. **Uses dynamic rendering syntax: v-for and {{...}} interpolation.** Calls an Instructions file via customHooks (list-system-tasks.json). Template type, use of standard HTML tags, and dynamic rendering syntax need documentation.

## Validations
- [x] [ai-probe-validation.json](CHECKLIST.md#6-общие-проверки) - Converted from ValidationRules/ValidationRuleSet to Instructions format. See detailed conversion logic: [/docs/ui/core-concepts/validation-conversion-logic.md]. **Context of Use:** Likely called by a UI component/action to validate user input (e.g., from `qtu-user-input-section.json`). Results (`buffer:validationFailed`, `buffer:validationErrors`) are presumably used by UI to display errors. 