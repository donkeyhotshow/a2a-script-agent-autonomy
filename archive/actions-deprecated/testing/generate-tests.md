# generate-tests

| Параметр | Значение |
|----------|----------|
| actionId | generate-tests |
| categoryId | testing |
| executorSystemId | agent |
| title | Генерация тестов |
| canMigrateToScript | ⏳ |

## Описание

Агент генерирует unit и интеграционные тесты на основе кода или спецификаций.

## Типы генерируемых тестов

### Unit Tests
- Тесты отдельных функций/методов
- Тесты классов
- Тесты компонентов (Vue/React)
- Моки зависимостей

### Integration Tests
- Тесты API endpoints
- Тесты БД
- Тесты интеграций с внешними сервисами
- E2E тесты

## Примеры

### PHPUnit (Laravel)
```
php
public function test_user_can_register()
{
    $response = $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect('/home');
}
```

### Jest (JavaScript)
```
javascript
test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
```

### Vue Test Utils
```
javascript
test('renders correct title', () => {
  const wrapper = mount(Component, {
    props: { title: 'Hello' }
  });
  expect(wrapper.text()).toContain('Hello');
});
```

## Инструменты

- PHPUnit
- Jest
- Vitest
- PyTest
- Cypress
- Playwright

## Требования к качеству

- Покрытие > 80%
- Понятные названия
- Изоляция тестов
- Быстрое выполнение
- Атомарные тесты
