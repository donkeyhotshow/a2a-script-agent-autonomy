# S9: Папки N-sub-M не попадают в sim-validate/sim-lint

## Проблема
- Симуляции вида `interrupt-thinking/1-sub-1/`, `interrupt-thinking/1-sub-2/` не обнаруживаются
- `sim:validate` и `sim:lint` пропускают подшаги

## Примеры
- `interrupt-thinking/1-sub-1/`
- `interrupt-thinking/1-sub-2/`

## Критерий 完成
- Все подпапки `*-sub-*` должны включаться в валидацию
- Запустить тест и убедиться, что они обрабатываются