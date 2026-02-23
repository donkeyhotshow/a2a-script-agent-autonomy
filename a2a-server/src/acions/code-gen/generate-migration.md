# generate-migration

| Параметр | Значение |
|----------|----------|
| actionId | generate-migration |
| categoryId | code-gen |
| executorSystemId | agent |
| title | Генерация миграции |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент генерирует миграцию базы данных на основе модели или спецификации.

## Генерируемое содержимое

- Create table
- Add column
- Modify column
- Drop table
- Add index
- Add foreign key
- Add constraint

## Примеры

### Laravel
```
php
// php artisan make:migration create_posts_table
Schema::create('posts', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('content');
    $table->foreignId('user_id')->constrained();
    $table->timestamps();
});
```

### Prisma
```
prisma
// prisma migrate dev --name init
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

### SQL
```
sql
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Best practices

- Имена миграций информативны
- Обработка отката
- Не изменять существующие миграции
- Использовать transactions
- Тестировать миграции
