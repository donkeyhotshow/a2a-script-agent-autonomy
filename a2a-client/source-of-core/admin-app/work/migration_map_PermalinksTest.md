# Migration Map for tests/Feature/AiRudeDepot/PermalinksTest.php

Эта карта сопоставляет Feature-тесты из `PermalinksTest.php` с соответствующими классами и методами, обеспечивающими работу механизма пермалинков.

Основные затрагиваемые компоненты:
- `App\AiRudeDepot\Managers\PermanentLinkManager::getPermalink` — получение данных пермалинка.
- `App\Http\Controllers\Frontend\ModuleResolverController::handle` — основной вход в обработку запроса.
- `App\Http\Controllers\Frontend\ModuleResolverController\Helpers\PermalinkHelper::isValidPermalink` — валидация структуры и доступа.
- `App\Http\Controllers\Frontend\ModuleResolverController\ModuleRunner::runAndRender` — запуск приложения и рендеринг через Inertia.
- `App\AiRudeDepot\App\Main::runAppEnv` — выполнение логики модуля и формирование `StepResponse`.

---

Test Method: `test_accesses_simple_public_permalink`
Tests:
- GET `/simple-page` должен возвращать HTTP 200
- Inertia-ответ компонента `Dynamic/Index` с props: `step_status` = OK, `title`, `permalink_data`, `module_slug`, `page_identifier`, `component`, `history`, `console`
Potential App Code Area:
- `PermanentLinkManager::getPermalink('simple-page')`
- `PermalinkHelper::isValidPermalink($entry, 'simple-page')` для `required_access` = 'public'
- `ModuleResolverController::handle` вызывает `ModuleRunner::runAndRender($request, 'test-page-module', 'simple-page', ...)`
- `ModuleRunner::runAndRender` формирует Inertia-ответ

---

Test Method: `test_denies_access_to_admin_permalink_for_guest`
Tests:
- GET `/admin-page` без аутентификации должен возвращать HTTP 403 / Inertia-ответ для Forbidden
Potential App Code Area:
- `PermanentLinkManager::getPermalink('admin-page')` с `required_access` = 'admin'
- `PermalinkHelper::isValidPermalink` выявляет несоответствие доступа
- `ModuleRunner::runAndRender` получает `StepStatusEnum::ERROR_FORBIDDEN` и возвращает 403

---

Test Method: `test_internally_redirects_using_link_attribute`
Tests:
- GET `/linked-page-source` должен возвращать редирект на `/linked-page-target`
Potential App Code Area:
- Пермалинк `'linked-page-source'` содержит ключ `link` = 'linked-page-target'
- `PermalinkHelper` обрабатывает переадресацию по атрибуту `link`
- `ModuleRunner::runAndRender` устанавливает HTTP-код 302 при наличии `redirectUrl`

---

Test Method: `test_handles_subpaths_via_parent_permalink`
Tests:
- GET `/parent/child/subpath` должен обрабатываться пермалинком `parent` (handles_subpaths = true)
Potential App Code Area:
- `PathHelper::normalize('parent/child/subpath')` возвращает 'parent/child/subpath' или 'parent'
- `PermanentLinkManager::getPermalink('parent')` с `handles_subpaths` = true
- `PermalinkHelper::isValidPermalink` учитывает `handles_subpaths`
- `ModuleRunner::runAndRender` запускает модуль `test-subpath-module`, pageIdentifier = 'parent'

---

Test Method: `test_returns_404_for_non_existent_permalink`
Tests:
- GET `/non-existent` должен возвращать HTTP 404 и Inertia-страницу ошибок '404'
Potential App Code Area:
- `PermanentLinkManager::getPermalink('non-existent')` возвращает null
- `PermalinkHelper::isValidPermalink` возвращает false
- `ModuleRunner::runAndRender(..., 'errors', '404', ...)` возвращает 404

---

Test Method: `test_loads_playground_index_via_playground_link`
Tests:
- GET `/playground` редиректит на `/playground/index`
Potential App Code Area:
- Пермалинк `'playground'` содержит `link` = '/playground/index'
- `PermalinkHelper` направляет на целевой путь
- `ModuleRunner::runAndRender` генерирует редирект 302

---

Test Method: `test_loads_playground_index_directly`
Tests:
- GET `/playground/index` возвращает HTTP 200 с контентом модуля
Potential App Code Area:
- `PermanentLinkManager::getPermalink('playground/index')`
- `ModuleRunner::runAndRender` вызывает Main и рендерит страницу

---

Test Method: `test_redirects_to_500_on_link_loop`
Tests:
- GET `/loop-a` или `/loop-b` с циклическими ссылками приводит к HTTP 500
Potential App Code Area:
- `PermanentLinkManager` возвращает entries с `link` между `loop-a` и `loop-b`
- `PermalinkHelper` / `ModuleRunner` обнаруживает цикл (Loop Detected) и `StepStatusEnum::ERROR_CRITICAL`
- Возвращается HTTP 500

---

Test Method: `test_redirects_to_500_on_excessive_link_depth`
Tests:
- GET `/depth-1` ... `/depth-16` превышает максимально допустимую вложенность
Potential App Code Area:
- `PermanentLinkManager` задаёт цепочку ссылок глубиной 16
- `PermalinkHelper` или `ModuleRunner` ограничивает глубину и возвращает `ERROR_CRITICAL`
- HTTP 500

---

Test Method: `test_error_during_module_execution_includes_history`
Tests:
- GET `/error-trigger-page` вызывает модуль, который бросает исключение
- Inertia-ответ содержит ключ `history` (пусть и пустой) и HTTP 500
Potential App Code Area:
- `Main::runAppEnv` генерирует исключение или `StepStatusEnum::ERROR_UNHANDLED_EXCEPTION`
- `ModuleRunner::runAndRender` ловит и устанавливает статус 500, включая историю из `StepResponse`

---

