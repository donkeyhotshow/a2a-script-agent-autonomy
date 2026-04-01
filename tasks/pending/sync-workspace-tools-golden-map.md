# S12: agent-workspace-tools покрывает 4 ключей; остальное размазано по симам

## Проблема
- Симуляция `agent-workspace-tools` покрывает только 4 workspace-ключа
- Остальные workspace-ключи разбросаны по разным симуляциям без документирования
- Нет "golden map" для понимания покрытия

## Связь с AGENTS.md
- "Workbench" — structured state в `context.workbench.sections`
- Необходимо документировать какие ключи workbench какие симуляции покрывают

## Критерий 完成
- Создать матрицу покрытия workspace-ключей
- Все ключи workbench документированы в golden-симуляциях