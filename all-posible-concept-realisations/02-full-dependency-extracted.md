# Вариант 2: Граф = полный граф зависимостей (извлечённый)

**Суть:** Граф — полная карта зависимостей проекта. Entity recognizer + relation mapper извлекают из codeBlocks. Итеративный сбор через questions.

**Источник данных:** codeBlocks от клиента → recognizeEntitiesBatch → buildAndStoreGraph.

**Роль в системе:** 
- Понимание структуры проекта
- Запрос недостающих файлов (request_files)
- Контекст для external AI (какие файлы связаны)

**Текущая реализация:** Именно это. entity-recognizer, relation-mapper, question-generator.
