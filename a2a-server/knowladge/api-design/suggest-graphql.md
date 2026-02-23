# suggest-graphql

| Параметр | Значение |
|----------|----------|
| actionId | suggest-graphql |
| categoryId | api-design |
| executorSystemId | agent |
| title | Предложение GraphQL |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент анализирует существующий REST API и предлагает переход на GraphQL для улучшения гибкости.

## Когда рекомендовать GraphQL

### Преимущества
- Гибкие запросы (клиент выбирает поля)
- Один эндпоинт для всех данных
- Strongly typed schema
- Real-time с subscriptions
- Frontend-driven запросы

### Недостатки
- Сложность кэширования
- N+1 проблема
- Сложность файловых загрузок

## Типичные предложения

### Schema Design
```
graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}
```

### Implementation
- Apollo Server
- Lighthouse (Laravel)
- Hasura
- Prisma

## Best practices

- Схема должна быть declarative
- ИспользоватьConnections для пагинации
- Избегатьdeeply nested queries
- Mutations должны быть predictable
