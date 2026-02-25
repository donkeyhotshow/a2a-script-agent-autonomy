# Migration Map for tests/Feature/SearchTest.php

Эта карта показывает, какие методы тестируются в `SearchTest.php` и какие части кода приложения они покрывают.

Feature-тесты (SearchTest.php) проверяют базовую функциональность поиска через API и валидацию входных параметров запроса.

---

Test Method: `test_can_search_documents`
Tests: Basic search by query parameter without additional filters.
Potential App Code Area:
- `App\Http\Controllers\SearchController::search`
- Валидация параметра `query` в `search(Request $request)`
- Вызов `SearchService::search($query, [], 1, 15, 'relevance', 'desc', false)`

---

Test Method: `test_can_use_fuzzy_search`
Tests: Search using fuzzy matching (`use_fuzzy=true`).
Potential App Code Area:
- `SearchController::search` с параметром `use_fuzzy` валидация boolean
- Вызов `SearchService::search(..., true)`

---

Test Method: `test_can_filter_by_metadata`
Tests: Search with `filters` parameter to narrow results.
Potential App Code Area:
- `SearchController::search` валидация `filters` как массив строк
- Вызов `SearchService::search($query, $filters, ...)`

---

Test Method: `test_can_sort_results`
Tests: Search with sorting parameters (`sort_by` и `sort_direction`).
Potential App Code Area:
- `SearchController::search` валидация `sort_by` и `sort_direction`
- Вызов `SearchService::search(..., $sortBy, $sortDirection, ...)`

---

Test Method: `test_can_handle_pagination`
Tests: Search with `page` и `per_page` параметрами.
Potential App Code Area:
- `SearchController::search` валидация `page` и `per_page`
- Вызов `SearchService::search(..., $page, $perPage, ...)`

---

Test Method: `test_returns_error_for_empty_query`
Tests: Response status 400 when `query` отсутствует или пустая строка.
Potential App Code Area:
- Валидация `query` правила `required|string|min:1` в `SearchController::search`
- Обработка `ValidationException` в catch, возвращает 400 с `error: 'Search query is required'`

---

Test Method: `test_returns_error_for_invalid_sort_field`
Tests: Response status 400 когда `sort_by` не входит в список допустимых значений.
Potential App Code Area:
- Валидация `sort_by` правило `in:relevance,created_at,updated_at,title`
- Обработка `ValidationException` в catch, возвращает 400 с `error: 'Invalid sort field...'`

---


