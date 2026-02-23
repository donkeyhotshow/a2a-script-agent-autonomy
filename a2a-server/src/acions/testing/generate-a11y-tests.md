# generate-a11y-tests

| Параметр | Значение |
|----------|----------|
| actionId | generate-a11y-tests |
| categoryId | a11y |
| executorSystemId | agent |
| title | Генерация a11y тестов |
| framework | all |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует accessibility тесты для компонентов.

## Примеры

### Button Component
```
typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('Button a11y', () => {
  test('should have no violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('should have accessible name', () => {
    render(<Button>Submit</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName()
  })

  test('should be keyboard accessible', () => {
    render(<Button>Action</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('tabIndex', '0')
  })
})
```

### Form Component
```
typescript
describe('Form a11y', () => {
  test('labels should be associated', async () => {
    const { container } = render(<LoginForm />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('error messages should be announced', () => {
    render(<Form errors={['Required field']} />)
    const error = screen.getByRole('alert')
    expect(error).toBeInTheDocument()
  })
})
```

## Типы тестов

- Keyboard navigation
- Screen reader support
- Color contrast
- ARIA attributes
- Focus management
- Form labels

## Рекомендации

- Тестировать все interactive elements
- Проверять keyboard trap
- Использовать role и aria-* атрибуты
- Тестировать error states
