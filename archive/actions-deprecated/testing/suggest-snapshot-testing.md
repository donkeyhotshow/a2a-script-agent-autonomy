# suggest-snapshot-testing

| Параметр | Значение |
|----------|----------|
| actionId | suggest-snapshot-testing |
| categoryId | snapshot |
| executorSystemId | agent |
| title | Предложение snapshot testing |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент предлагает использовать snapshot testing для определенных сценариев.

## Когда использовать

- UI компоненты
- API responses
- Large data structures
- JSON/XML output
- Error messages

## Примеры

### Jest

```
typescript
test('renders correctly', () => {
  const tree = renderer
    .create(<HelloComponent name="World" />)
    .toJSON()
  expect(tree).toMatchSnapshot()
})
```

### Vitest

```
typescript
import { assertSnapshot } from 'vitest/snapshot'

test('snapshot test', async () => {
  const result = processData(input)
  await assertSnapshot(result)
})
```

## Рекомендации

- Использовать для UI компонентов
- Обновлять при намеренных изменениях
- Хранить в VCS
- Использовать inline snapshots для small data
- Комбинировать с другими тестами
