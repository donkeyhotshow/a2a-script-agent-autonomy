# Симуляция системы после обновления по планам

## Цель

Симулировать работу системы после реализации следующих планов:

1. **1.1 TaskDetailAnalyzer** - Расширенный анализ детализации задачи
2. **1.3 Iterative Processing** - Полная поддержка итераций
3. **1.4 Graph Store Persistence** - Персистентность графа
4. **2.1 JSON API Extension** - Расширенный API с questions, fixes, iterations
5. **3.1 Task Classifier** - Классификация задач (mechanical vs semantic)
6. **3.2 PSR4 Analyzer** - Анализатор PSR-4
7. **3.3 Instruction Generator** - Генератор инструкций (fixes)
8. **3.4 Entity Recognizer Improvements** - Улучшенное распознавание сущностей
9. **3.5 Session Context Management** - Управление контекстом сессии
10. **4.2 File Scanner** - Сканирование файлов

## Структура симуляции

```
upgrades-simulation/
├── README.md                          # Этот файл
├── flow-diagram.md                    # Диаграмма потока данных
├── technical-details.md               # Технические детали реализации
├── iteration-1-initial/               # Итерация 1: Начальный запрос
│   ├── request.json
│   ├── server-analysis.json
│   └── response.json
├── iteration-2-files/                 # Итерация 2: Предоставление файлов
│   ├── request.json
│   ├── psr4-analysis.json
│   ├── entity-recognition.json
│   └── response.json
├── iteration-3-analysis/               # Итерация 3: Анализ
│   ├── request.json
│   ├── task-classification.json
│   ├── graph-analysis.json
│   └── response.json
├── iteration-4-instructions/          # Итерация 4: Инструкции
│   ├── request.json
│   ├── fix-instructions.json
│   └── response.json
└── iteration-5-complete/              # Итерация 5: Завершение
    ├── request.json
    └── response.json
```

## Сценарий симуляции

### Задача
Пользователь отправляет задачу: **"исправить импорты после рефакторинга"**

### Ожидаемый результат
1. Система классифицирует задачу как MECHANICAL
2. Система запрашивает необходимые файлы
3. Система анализирует PSR-4 правила
4. Система генерирует инструкции по исправлению
5. Клиент применяет исправления
6. Задача завершается

## Ключевые изменения в системе

| Компонент | До | После |
|-----------|-----|-------|
| Task Analysis | Базовый | NLP + embedding + classification |
| Iterations | Ограничено | Полная поддержка (до 5) |
| API Response | Базовый | questions[], fixes[], iterations |
| Task Type | Не определен | MECHANICAL / SEMANTIC / HYBRID |
| Context | In-memory | Опционально в БД |
| Instructions | injected_content | structured fixes[] |

## Outcome типы

| Outcome | Значение | Следующее действие |
|---------|----------|---------------------|
| `need_files` | Нужны файлы | Клиент отправляет файлы |
| `need_project_scan` | Нужно сканирование | Клиент сканирует проект |
| `need_clarification` | Нужно уточнение | Сервер задает вопросы |
| `ready_to_fix` | Готов к исправлению | Клиент применяет fixes |
| `completed` | Завершено | Конец |

## Метрики

- Количество итераций: 3-5
- Точность классификации: >90%
- Время анализа: <100ms для механических задач
