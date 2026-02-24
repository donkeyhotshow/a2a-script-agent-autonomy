# Project Coding Rules (Non-Obvious Only)

- **Use .js extension for path aliases** - Imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution in [`tsconfig.json`](a2a-server/tsconfig.json:4-5))
- **Server does NOT store client data** - Graph is passed in context and returned in response; never persist client graph state
- **ActionProcessor for no-AI mode** - Actions defined in MD files under `a2a-server/src/actions/definitions/` are executed without AI calls
- **PhaseMachine drives request flow** - Phases: idle → discovery → recognition → analysis → action → validation → completed
- **Actions use sub-actions with DSL** - Each action MD file contains sub-actions with TypeScript code blocks that run on client

## qtu - Question to User (Интерактивные вопросы пользователю)
**ВАЖНО: Используйте `qtu` регулярно при неопределённости!** Это предотвращает ошибки в критических местах.

`qtu` - PowerShell скрипт для интерактивного задавания вопросов через веб-интерфейс. Запускает PHP сервер, открывает браузер и ожидает ответа пользователя.

**Когда использовать:**
- Не уверены в правильности выбора архитектурного решения
- Нужно уточнить требования у пользователя
- Есть несколько вариантов реализации и нужно выбрать оптимальный
- Требуется подтверждение перед деструктивными операциями (удаление файлов, изменение структуры)
- Необходимо получить дополнительные данные, которые нельзя вывести из контекста

**Использование:**
```powershell
# Простой текстовый вопрос
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Ваш вопрос?"

# Вопрос с вариантами выбора (Свой вариант добавляется автоматически)
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Какой подход использовать?" -Options "Оптимизация памяти,Оптимизация скорости,Баланс"

# С указанием порта и таймаута
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Ваш вопрос?" -Port 9000 -Timeout 300
```

**Параметры:**
| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `-Question` | Текст вопроса (обязательный) | - |
| `-Options` | Варианты ответа через запятую | - |
| `-Port` | Порт PHP сервера | 8765 |
| `-Timeout` | Таймаут ожидания в секундах | 600 |
| `-Help` | Показать справку | - |

**Требования:**
- PHP должен быть установлен и доступен в PATH
- Браузер по умолчанию (Edge/Chrome/Firefox)

**Файлы:**
- `questions-to-user/questions.json` - все вопросы
- `questions-to-user/questions/q_xxx.json` - отдельный файл вопроса
- `questions-to-user/answers.json` - ответы пользователя
