# generate-crud

| Параметр | Значение |
|----------|----------|
| actionId | generate-crud |
| categoryId | code-gen |
| executorSystemId | agent |
| title | Генерация CRUD |
| framework | all |
| canMigrateToScript | ✅ |

## Описание

Агент генерирует полный CRUD (Create, Read, Update, Delete) код для сущности.

## Генерируемые компоненты

### Backend
- Model
- Controller
- Repository/Service
- Validation
- Routes
- Migration

### Frontend (если нужно)
- List view
- Create/Edit form
- API service
- Types/Interfaces

## Примеры

### Laravel
```
php
// Artisan: php artisan make:model Post -mcr
// Генерирует: Model, Migration, Controller
```

### Node.js + Express
```
javascript
// Express Router
router.get('/posts', postController.index);
router.post('/posts', postController.store);
router.get('/posts/:id', postController.show);
router.put('/posts/:id', postController.update);
router.delete('/posts/:id', postController.destroy);
```

### NestJS
```
typescript
@Controller('posts')
export class PostsController {
  @Get()
  findAll() { }
  
  @Post()
  create(@Body() createPostDto: CreatePostDto) { }
}
```

## Best practices

- RESTful endpoints
- Validation
- Error handling
- Pagination
- Filtering
- Authorization
