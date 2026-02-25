# Партиал: Требования к e-commerce каталогу

**Границы ответственности:** Только требования к интернет-магазину и каталогу товаров

## 📌 Ответственность этого партиала

Этот партиал содержит **только требования к e-commerce каталогу** - товары, категории, корзина, оформление заказа, платежи, управление товарами.

### Что находится в этом партиале:
- ✅ Каталог товаров (список, детальная страница, фильтры, поиск)
- ✅ Корзина покупок
- ✅ Оформление заказа
- ✅ Платежные системы
- ✅ Управление товарами в админке
- ✅ Категории и теги товаров
- ✅ Отзывы на товары
- ✅ Система скидок и промокодов

### Что НЕ находится в этом партиале:
- ❌ Общие требования (находятся в `docs\requirements\project-requirements-core-and-layout.md`)
- ❌ Требования к тестам (находятся в `docs\requirements\project-requirements-tests.md`)
- ❌ Невыполненные требования (находятся в `docs\requirements\project-requirements-missed.md`)
- ❌ Требования к лендингу (находятся в `docs\requirements\project-requirements-landing.md`)
- ❌ Общие требования к админке (находятся в `docs\requirements\project-requirements-admin.md`, но управление товарами связано)

## 🔗 Связанные файлы

- `docs\requirements\project-requirements-core-and-layout.md` - общие требования (для базовых классов, API)
- `docs\requirements\project-requirements-admin.md` - админ-панель (для управления товарами, заказами)
- `docs\requirements\project-requirements-tests.md` - требования к тестам каталога
- `docs\requirements\project-requirements-missed.md` - невыполненные требования каталога

## 📋 Правила синхронизации

### При добавлении нового компонента каталога:
1. Добавить в этот файл описание компонента
2. Обновить `docs\requirements\project-requirements-missed.md` - добавить в список невыполненных (❌ ОТСУТСТВУЕТ)
3. Обновить `docs\requirements\project-requirements-tests.md` - добавить требования к тестам
4. Если компонент управляется через админку - обновить `docs\requirements\project-requirements-admin.md`

### При реализации компонента:
1. Обновить `docs\requirements\project-requirements-missed.md` - отметить как выполненное (✅ РЕАЛИЗОВАНО)
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для реализованного компонента

### При изменении API каталога:
1. Обновить этот файл с новым API
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для нового API
3. Если изменился фронтенд API - обновить соответствующие Vue компоненты в этом файле

## 📝 Структура требований каталога

### Модели каталога
- Product
- Category
- ProductVariant
- ProductImage
- ProductAttribute
- Tag
- Review
- Cart
- CartItem
- Order
- OrderItem
- Discount
- Coupon
- Payment

### Контроллеры каталога
- CatalogController
- ProductController
- CategoryController
- CartController
- OrderController
- ReviewController
- PaymentController
- DiscountController

### Сервисы каталога
- ProductService
- CartService
- OrderService
- PaymentService
- DiscountService
- ReviewService

### Vue компоненты каталога
- Index.vue (список товаров)
- Product.vue (детальная страница)
- Category.vue (страница категории)
- Search.vue (поиск)
- Cart/Index.vue (корзина)
- Cart/Checkout.vue (оформление заказа)

## 🔄 Правила обновления

1. **При добавлении новой модели каталога:**
   - Добавить в раздел "Модели каталога"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

2. **При добавлении нового контроллера каталога:**
   - Добавить в раздел "Контроллеры каталога"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

3. **При добавлении нового Vue компонента каталога:**
   - Добавить в раздел "Vue компоненты каталога"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

4. **При изменении API каталога:**
   - Обновить раздел "API для каталога"
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами

