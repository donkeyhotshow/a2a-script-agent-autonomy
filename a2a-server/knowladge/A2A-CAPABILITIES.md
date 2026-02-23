# A2A System - General Actions Table

## Категории исполнителей

- **script** - Автоматический скрипт
- **agent** - LLM через agent
- **agent** - A2A агент

## Таблица действий

| actionId | categoryId | executorSystemId | title | canMigrateToScript |
|----------|-----------|------------------|-------|-------------------|
| monitor-system-health | monitoring | script | Мониторинг состояния системы | ✅ |
| detect-anomalies | monitoring | agent | Детекция аномалий | ⏳ |
| send-alerts | monitoring | script | Отправка уведомлений | ✅ |
| suggest-scaling | optimization | agent | Предложение масштабирования | ✅ |
| cleanup-unused-data | optimization | script | Очистка данных | ✅ |
| detect-code-smells | code-quality | script | Детекция code smells | ✅ |
| suggest-refactoring | code-quality | agent | Предложение рефакторинга | ✅ |
| apply-refactoring | code-quality | agent | Применение рефакторинга | ⏳ |
| generate-readme | documentation | agent | Генерация README | ✅ |
| generate-api-docs | documentation | script | Генерация API docs | ✅ |
| scan-vulnerabilities | security | script | Сканирование уязвимостей | ✅ |
| check-dependencies | security | script | Проверка зависимостей | ✅ |
| detect-secrets | security | script | Детекция секретов | ✅ |
| rotate-keys | security | agent | Ротация ключей | ⏳ |
| collect-metrics | analytics | script | Сбор метрик | ✅ |
| generate-reports | analytics | agent | Генерация отчетов | ✅ |
| predict-trends | analytics | agent | Предсказание трендов | ❌ |
| sync-data | integration | script | Синхронизация данных | ✅ |
| orchestrate-workflow | integration | agent | Оркестрация workflow | ⏳ |
| manage-queues | integration | script | Управление очередями | ✅ |
| generate-tests | testing | agent | Генерация тестов | ⏳ |
| run-regression-tests | testing | script | Регрессионное тестирование | ✅ |
| validate-data | testing | script | Валидация данных | ✅ |
| auto-deploy | devops | script | Автоматический деплой | ✅ |
| rollback-deployment | devops | agent | Откат деплоя | ⏳ |
| provision-servers | infrastructure | agent | Provisioning серверов | ⏳ |
| configure-env | infrastructure | script | Конфигурация окружений | ✅ |
| coordinate-tasks | communication | agent | Координация задач | ⏳ |
| send-notifications | communication | script | Отправка уведомлений | ✅ |
| process-transactions | business-logic | agent | Обработка транзакций | ⏳ |
| manage-state-machine | business-logic | agent | Управление состоянием | ⏳ |
| index-documents | search | script | Индексация документов | ✅ |
| semantic-search | search | agent | Семантический поиск | ❌ |
| invalidate-cache | caching | script | Инвалидация кэша | ✅ |
| generate-code | code-gen | agent | Генерация кода | ⏳ |
| generate-test-data | code-gen | script | Генерация тестовых данных | ✅ |
| generate-migrations | code-gen | script | Генерация миграций | ✅ |
| etl-process | data-transform | script | ETL процессы | ✅ |
| aggregate-data | data-transform | script | Агрегация данных | ✅ |
| semantic-versioning | versioning | script | Семантическое версионирование | ✅ |
| migrate-db-schema | migration | script | Миграция схемы БД | ✅ |
| migrate-data | migration | agent | Миграция данных | ⏳ |
| shard-data | scaling | agent | Sharding данных | ⏳ |
| load-balance | scaling | script | Load balancing | ✅ |
| optimize-queries | performance | agent | Оптимизация запросов | ✅ |
| add-indexes | performance | agent | Добавление индексов | ⏳ |
| schedule-cron-jobs | scheduling | script | Планирование задач | ✅ |
| manage-priority-queue | scheduling | script | Priority queues | ✅ |
| upload-files | file-management | script | Загрузка файлов | ✅ |
| archive-files | file-management | script | Архивация файлов | ✅ |
| structured-logging | logging | script | Структурированные логи | ✅ |
| aggregate-logs | logging | script | Агрегация логов | ✅ |
| auto-backup | backup | script | Автоматические бэкапы | ✅ |
| restore-backup | backup | agent | Восстановление | ⏳ |
| self-heal | self-healing | agent | Self-healing | ⏳ |
| predict-failures | predictive | agent | Предсказание сбоев | ❌ |
| improve-algorithms | learning | agent | Улучшение алгоритмов | ❌ |

## Статистика

- **Всего действий**: 73
- **script**: 45 (62%)
- **agent**: 12 (16%)
- **agent**: 16 (22%)
- **Можно мигрировать на script**: 10 из 16 (63%)

## Категории

1. **monitoring** - Мониторинг
2. **self-healing** - Самовосстановление
3. **optimization** - Оптимизация
4. **code-quality** - Качество кода
5. **documentation** - Документация
6. **security** - Безопасность
7. **analytics** - Аналитика
8. **integration** - Интеграции
9. **testing** - Тестирование
10. **devops** - DevOps
11. **infrastructure** - Инфраструктура
12. **communication** - Коммуникация
13. **business-logic** - Бизнес-логика
14. **search** - Поиск
15. **caching** - Кэширование
16. **code-gen** - Генерация кода
17. **data-transform** - Трансформация данных
18. **versioning** - Версионирование
19. **migration** - Миграции
20. **distributed** - Распределенные системы
21. **scaling** - Масштабирование
22. **performance** - Производительность
23. **scheduling** - Планирование
24. **file-management** - Управление файлами
25. **logging** - Логирование
26. **backup** - Бэкапы
28. **ab-testing** - A/B тестирование
29. **predictive** - Предсказательная аналитика
30. **learning** - Обучение
