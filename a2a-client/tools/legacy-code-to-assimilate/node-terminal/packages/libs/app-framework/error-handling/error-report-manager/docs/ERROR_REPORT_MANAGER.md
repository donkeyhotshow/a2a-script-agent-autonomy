# Система управления отчетами об ошибках

## Обзор

Новая система управления отчетами об ошибках решает проблему дублирования файлов и обеспечивает автоматический сброс статуса через 60 минут. Система интегрирована с task-manager для синхронизации статусов.

## Основные возможности

### ✅ Решенные проблемы
- **Дублирование файлов** - перезапись вместо создания новых файлов
- **Автоматический сброс статуса** - каждые 60 минут
- **Уникальные ключи ошибок** - на основе MD5 хеша контекста
- **Интеграция с task-manager** - синхронизация статусов
- **Миграция существующих отчетов** - автоматическое переименование

### 🔧 Компоненты системы

1. **ErrorReportManager** (`libs/error-report-manager/index.js`) - основной менеджер
2. **CLI интерфейс** (`libs/error-report-manager/cli.js`) - командная строка
3. **Обновленный errorHandler** (`utils/errorHandler.js`) - интеграция
4. **Обновленный ultimate-start.bat** - использование нового менеджера
5. **Скрипт миграции** (`scripts/migrate-error-reports.js`) - миграция старых отчетов

## Использование

### 1. Создание отчета об ошибке

```bash
# Через CLI
node libs/error-report-manager/cli.js create UI_TIMEOUT "UI не отвечает" "UI порт 5179 не поднялся" high

# Через ultimate-start.bat (автоматически)
ultimate-start.bat
```

### 2. Просмотр отчетов

```bash
# Все активные отчеты
node libs/error-report-manager/cli.js list

# Отчеты с определенным статусом
node libs/error-report-manager/cli.js list --status=open
```

### 3. Обновление статуса

```bash
# Решение проблемы
node libs/error-report-manager/cli.js update UI_TIMEOUT_abc123 resolved "admin"

# Автоматический сброс
node libs/error-report-manager/cli.js update UI_TIMEOUT_abc123 auto_reset
```

### 4. Очистка старых отчетов

```bash
# Dry-run (показать что будет удалено)
node libs/error-report-manager/cli.js cleanup 24h --dry-run

# Реальное удаление отчетов старше 24 часов
node libs/error-report-manager/cli.js cleanup 24h
```

### 5. Синхронизация с task-manager

```bash
# Синхронизация статусов
node libs/error-report-manager/cli.js sync-tasks
```

### 6. Миграция существующих отчетов

```bash
# Миграция всех старых отчетов
node scripts/migrate-error-reports.js

# Только очистка дубликатов
node scripts/migrate-error-reports.js cleanup
```

## Структура файлов отчетов

### Новый формат именования
```
error_{КОД_ОШИБКИ}_{MD5_ХЕШ}_{TIMESTAMP}.md
```

Пример:
```
error_UI_TIMEOUT_a1b2c3d4_2025-01-18T17-11-08-123Z.md
```

### Содержимое отчета
```markdown
# Отчет об ошибке: UI порт 5179 не поднялся

**Код ошибки:** UI_TIMEOUT  
**Время:** 18.01.2025 17:11:08  
**Статус:** open  
**Ключ ошибки:** UI_TIMEOUT_a1b2c3d4  
**Попытки:** 1  

## Описание
API работает, но UI не отвечает на порту 5179

## Контекст
- **Скрипт:** ultimate-start.bat
- **Рабочая директория:** C:\apps\root\mcp\projects-manager
- **Node.js:** v24.5.0
- **Платформа:** win32

## Параметры
```json
{
  "scriptName": "ultimate-start.bat",
  "workingDir": "C:\\apps\\root\\mcp\\projects-manager",
  "nodeVersion": "v24.5.0",
  "platform": "win32"
}
```

## Действия
- [ ] Создана задача в task-manager
- [ ] Проверена конфигурация
- [ ] Проверены порты
- [ ] Проверены процессы

## Команды для диагностики
```bash
# Просмотр задач
node libs/task-manager/cli.js list --status open

# Проверка статуса демона
node libs/task-manager/cli.js heartbeat

# Проверка портов
netstat -ano | findstr ":3012|:5179"

# Проверка процессов
tasklist | findstr "node.exe"
```

---
*Отчет создан автоматически ultimate-start.bat*
*Последнее обновление: 18.01.2025 17:11:08*
```

## Автоматический сброс статуса

### Настройка
- **Интервал сброса:** 60 минут (настраивается)
- **Условие сброса:** отчеты со статусом "open" старше 60 минут
- **Новый статус:** "auto_reset"

### Логика работы
1. Каждые 60 минут система проверяет все открытые отчеты
2. Если отчет не обновлялся более 60 минут, статус меняется на "auto_reset"
3. В файл добавляется метка времени автосброса
4. Отчет остается в системе для анализа

### Отключение автосброса
```javascript
const errorManager = new ErrorReportManager({
  autoResetTimeout: 0 // Отключает автосброс
});
```

## Интеграция с task-manager

### Синхронизация статусов
- При создании отчета автоматически создается задача
- При изменении статуса отчета обновляется статус задачи
- При решении проблемы удаляется и отчет, и задача

### Связь между отчетами и задачами
```javascript
// В контексте задачи сохраняется ключ отчета
{
  errorKey: "UI_TIMEOUT_a1b2c3d4",
  reportFile: "work/error_UI_TIMEOUT_a1b2c3d4_2025-01-18T17-11-08-123Z.md"
}
```

## Миграция существующих отчетов

### Автоматическая миграция
1. Скрипт находит все файлы старого формата (`error_*_2025-*.md`)
2. Извлекает информацию из содержимого
3. Генерирует новый ключ ошибки
4. Переименовывает файл в новый формат
5. Обновляет содержимое отчета
6. Синхронизирует с task-manager

### Ручная миграция
```bash
# Запуск миграции
node scripts/migrate-error-reports.js

# Проверка результатов
node libs/error-report-manager/cli.js list
```

## Конфигурация

### Настройки ErrorReportManager
```javascript
const errorManager = new ErrorReportManager({
  reportsDir: 'work',                    // Директория отчетов
  autoResetTimeout: 60 * 60 * 1000,     // Интервал автосброса (60 мин)
  maxReports: 100                        // Максимальное количество отчетов
});
```

### Переменные окружения
```bash
# Интервал автосброса (в миллисекундах)
ERROR_REPORT_AUTO_RESET_TIMEOUT=3600000

# Директория отчетов
ERROR_REPORT_DIR=work

# Максимальное количество отчетов
ERROR_REPORT_MAX_COUNT=100
```

## API для разработчиков

### Создание отчета
```javascript
const ErrorReportManager = require('./libs/error-report-manager/index');

const errorManager = new ErrorReportManager();
await errorManager.initialize();

const report = await errorManager.createOrUpdateReport({
  code: 'UI_TIMEOUT',
  title: 'UI не отвечает',
  description: 'UI порт 5179 не поднялся',
  context: { port: 5179, script: 'ultimate-start.bat' },
  priority: 'high',
  scriptName: 'my-script.js'
});
```

### Обновление статуса
```javascript
await errorManager.updateReportStatus('UI_TIMEOUT_a1b2c3d4', 'resolved', 'admin');
```

### Получение активных отчетов
```javascript
const activeReports = await errorManager.getActiveReports();
```

## Мониторинг и обслуживание

### Ежедневные задачи
```bash
# Очистка старых отчетов (старше 7 дней)
node libs/error-report-manager/cli.js cleanup 7d

# Синхронизация с task-manager
node libs/error-report-manager/cli.js sync-tasks

# Проверка статусов
node libs/error-report-manager/cli.js list
```

### Мониторинг через cron
```bash
# Каждый час - синхронизация
0 * * * * cd /path/to/project && node libs/error-report-manager/cli.js sync-tasks

# Каждый день - очистка старых отчетов
0 2 * * * cd /path/to/project && node libs/error-report-manager/cli.js cleanup 7d
```

## Устранение неполадок

### Проблемы с миграцией
```bash
# Проверка существующих файлов
ls -la work/error_*.md

# Принудительная миграция
node scripts/migrate-error-reports.js

# Очистка дубликатов
node scripts/migrate-error-reports.js cleanup
```

### Проблемы с синхронизацией
```bash
# Проверка статуса task-manager
node libs/task-manager/cli.js heartbeat

# Принудительная синхронизация
node libs/error-report-manager/cli.js sync-tasks

# Проверка задач
node libs/task-manager/cli.js list --status open
```

### Сброс всех статусов
```bash
# Принудительный сброс всех открытых отчетов
node libs/error-report-manager/cli.js reset-all
```

## Логи и отладка

### Включение отладочного режима
```javascript
const errorManager = new ErrorReportManager({
  debug: true,
  logLevel: 'debug'
});
```

### Просмотр логов
```bash
# Логи ErrorReportManager
tail -f logs/error-report-manager.log

# Логи task-manager
tail -f logs/task-manager.log
```

## Безопасность

### Валидация входных данных
- Проверка кодов ошибок
- Санитизация описаний
- Валидация контекста

### Ограничения доступа
- Только авторизованные пользователи могут изменять статусы
- Логирование всех операций
- Резервное копирование перед удалением

---

*Документация создана для версии 2.0.0 системы управления отчетами об ошибках*

