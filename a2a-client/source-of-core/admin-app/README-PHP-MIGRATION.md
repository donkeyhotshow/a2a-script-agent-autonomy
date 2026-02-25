# Миграция с PowerShell на PHP

## Обзор проделанной работы

Проект перемещается с использования PowerShell скриптов на PHP скрипты с интеграцией глобальных трейтов хелперов. Это позволяет более эффективно использовать существующую PHP инфраструктуру проекта и улучшить качество кода.

### Созданные PHP-скрипты

1. **script/dispatcher.php** - основной диспетчер для работы с задачами и сценариями
2. **script/engine/index/indexer.php** - PHP-версия индексатора
3. **script/search-indexer/src/Search/searcher.php** - PHP-версия поискового движка
4. **script/engine/list.php** - скрипт для вывода списка задач или сценариев
5. **script/engine/info.php** - скрипт для отображения информации о задаче или сценарии
6. **script/engine/activate.php** - скрипт для активации задачи
7. **script/engine/reset.php** - скрипт для сброса прогресса сценария
8. **script/engine/process.php** - скрипт для обработки активной задачи

### Обновлённые PowerShell-скрипты

1. **script/includes/PhpInterop.ps1** - скрипт для вызова PHP-скриптов из PowerShell
2. **script/main.ps1** - основной скрипт, который теперь использует PHP-скрипты

### Удалённые PowerShell-скрипты

- script/engine/search/search.ps1

## Используемые трейты

Все PHP-скрипты используют следующие трейты:

- StringHelperTrait
- ArrayHelperTrait
- JsonHelperTrait
- FileHelperTrait
- PathHelperTrait
- ValidationHelperTrait (где применимо)

## Использование

### Через PowerShell

PowerShell-скрипты были обновлены для использования новых PHP-скриптов:

```powershell
# Список задач
.\main.ps1 -Mode list -Payload tasks

# Информация о задаче
.\main.ps1 -Mode info -TaskId TASK-001

# Активация задачи
.\main.ps1 -Mode activate -TaskId TASK-001

# Обработка активной задачи
.\main.ps1 -Mode process

# Сброс сценария для задачи
.\main.ps1 -Mode reset -TaskId TASK-001 -ScenarioId SCN-001
```

### Напрямую через PHP

Можно вызывать PHP-скрипты напрямую:

```bash
# Список задач
php script/engine/list.php --type=tasks

# Информация о задаче
php script/engine/info.php --task-id=TASK-001

# Активация задачи
php script/engine/activate.php --task-id=TASK-001

# Обработка активной задачи
php script/engine/process.php

# Сброс сценария для задачи
php script/engine/reset.php --task-id=TASK-001 --scenario-id=SCN-001

# Индексирование модуля
php script/dispatcher.php --mode=index --module=MyModule

# Поиск в индексе
php script/dispatcher.php --mode=search --query="error" --module=MyModule
```

## Дальнейшие шаги миграции

1. Перенести все оставшиеся PowerShell-скрипты на PHP
2. Создать PHP-фасады для каждой функции
3. Интегрировать с существующей архитектурой Laravel
4. Добавить тесты для PHP-скриптов
5. Удалить устаревшие PowerShell-скрипты после полного переноса функциональности

## Преимущества миграции

- Унификация кодовой базы (один язык вместо двух)
- Использование преимуществ ООП PHP
- Интеграция с существующими трейтами хелперов
- Лучшая поддержка сообществом
- Улучшенная производительность (PHP обычно работает быстрее PowerShell для сложных операций)
- Единая система логирования и обработки ошибок 