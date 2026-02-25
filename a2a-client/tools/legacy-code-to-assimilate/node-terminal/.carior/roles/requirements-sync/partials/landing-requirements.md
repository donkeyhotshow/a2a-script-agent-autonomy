# Партиал: Требования к лендингу

**Границы ответственности:** Только требования к публичному лендингу

## 📌 Ответственность этого партиала

Этот партиал содержит **только требования к лендингу** - секции, компоненты, функциональность, модель ценообразования, модули лендинга.

### Что находится в этом партиале:
- ✅ Секции лендинга (hero, features, pricing, testimonials, faq, cta, footer)
- ✅ Модель ценообразования (3 типа проектов × 5 уровней = 15 вариантов)
- ✅ Frontend компоненты для лендинга (Vue секции)
- ✅ Модули лендинга (hero, services, testimonials, faq, contact, newsletter)
- ✅ SSR для лендинга
- ✅ Функциональность лендинга (формы, аналитика, локализация)

### Что НЕ находится в этом партиале:
- ❌ Общие требования (находятся в `docs\requirements\project-requirements-core-and-layout.md`)
- ❌ Требования к тестам (находятся в `docs\requirements\project-requirements-tests.md`)
- ❌ Невыполненные требования (находятся в `docs\requirements\project-requirements-missed.md`)
- ❌ Требования к админке (находятся в `docs\requirements\project-requirements-admin.md`, но управление контентом лендинга связано)
- ❌ Требования к каталогу (находятся в `docs\requirements\project-requirements-catalog.md`)

## 🔗 Связанные файлы

- `docs\requirements\project-requirements-core-and-layout.md` - общие требования (для базовых классов, API, SSR)
- `docs\requirements\project-requirements-admin.md` - админ-панель (для управления контентом лендинга)
- `docs\requirements\project-requirements-tests.md` - требования к тестам лендинга
- `docs\requirements\project-requirements-missed.md` - невыполненные требования лендинга

## 📋 Правила синхронизации

### При добавлении нового компонента лендинга:
1. Добавить в этот файл описание компонента
2. Обновить `docs\requirements\project-requirements-missed.md` - добавить в список невыполненных (❌ ОТСУТСТВУЕТ)
3. Обновить `docs\requirements\project-requirements-tests.md` - добавить требования к тестам
4. Если компонент управляется через админку - обновить `docs\requirements\project-requirements-admin.md`

### При реализации компонента:
1. Обновить `docs\requirements\project-requirements-missed.md` - отметить как выполненное (✅ РЕАЛИЗОВАНО)
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для реализованного компонента

### При изменении API лендинга:
1. Обновить этот файл с новым API
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для нового API
3. Если изменился фронтенд API - обновить соответствующие Vue компоненты в этом файле

## 📝 Структура требований лендинга

### Секции лендинга
- HeroSection.vue
- AboutSection.vue
- FeaturesSection.vue
- ServicesSection.vue
- ProjectsSection.vue
- PortfolioSection.vue
- PricingSection.vue
- TestimonialsSection.vue
- FaqSection.vue
- BlogSection.vue
- CtaSection.vue
- ContactSection.vue
- NewsletterSection.vue
- IntegrationsSection.vue
- Footer.vue

### Модули лендинга
- HeroButton.vue
- PricingCards.vue
- FaqAccordion.vue
- PortfolioCarousel.vue
- ContactForm.vue
- LoadingSpinner.vue
- SuccessToast.vue

### Страницы лендинга
- Home.vue
- Privacy.vue
- Terms.vue

### Модель ценообразования
- 3 типа проектов × 5 уровней = 15 вариантов
- Базовая цена: 100000 UAH
- Уровни: Старт, Стандарт, Премиум, Корпоративный, Энтерпрайз

## 🔄 Правила обновления

1. **При добавлении новой секции лендинга:**
   - Добавить в раздел "Секции лендинга"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

2. **При добавлении нового модуля лендинга:**
   - Добавить в раздел "Модули лендинга"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

3. **При изменении модели ценообразования:**
   - Обновить раздел "Модель ценообразования"
   - Обновить `docs\requirements\project-requirements-missed.md` если требуется реализация
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами

4. **При изменении API лендинга:**
   - Обновить раздел "API для лендинга"
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами

