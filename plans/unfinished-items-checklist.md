# Чеклист недоработанных деталей

## 1. Симуляции (Simulations)

### 1.1 Пилотные симуляции (pilot) - РАБОТАЕТ ✅
- [x] simulation/1 - task_request → action_proposal
- [x] simulation/2 - approve_action → action_executing
- [x] simulation/3 - step_result → next step
- [x] simulation/4 - step_result → next step
- [x] simulation/5 - step_result → completed

### 1.2 Реальные экшены - СОЗДАНЫ ✅
- [x] analyze-full
- [x] analyze-architecture
- [x] analyze-typescript
- [x] analyze-vue
- [x] analyze-laravel
- [ ] analyze-performance
- [ ] analyze-security
- [x] generate-crud
- [x] generate-controller
- [x] generate-model
- [x] generate-migration
- [x] graph-build
- [x] graph-query
- [x] graph-impact
- [x] hybrid-fix
- [x] hybrid-refactor

---

## 2. Unified JSON Frontend Framework

### 2.1 Схемы (Schemas) - В РАБОТЕ 🔄
- [x] Базовые схемы созданы в simulations/pilot/schemas.ts
- [x] Расширить схемы для всех типов экшенов (simulations/schemas/real-actions.ts)
- [ ] Добавить валидацию в скрипты

### 2.2 Скрипты автоматизации - В РАБОТЕ 🔄
- [x] sim:create - создание симуляции
- [x] sim:run - запуск одной симуляции
- [x] sim:run-all - запуск всех симуляций
- [ ] sim:validate - валидация по схеме
- [ ] sim:compare - сравнение с gold standard
- [ ] sim:report - генерация отчета

### 2.3 Интеграция с фронтендом - НЕ НАЧАТО ⏳
- [ ] Создать TypeScript типы для всех ответов
- [ ] Парсеры для каждого типа ответа
- [ ] Vue компоненты для рендеринга
- [ ] VueFlow интеграция

---

## 3. a2a-server - недоработки

### 3.1 Request Processor
- [x] task_request → action_proposal
- [x] approve_action → action_executing
- [x] step_result → action_executing
- [ ] Обработка ошибок
- [ ] Логирование

### 3.2 Action Registry
- [ ] Документация экшенов
- [ ] Тесты

### 3.3 Action Executor
- [ ] Обработка таймаутов
- [ ] Rollback при ошибках

---

## 4. a2a-client - недоработки

### 4.1 API Client
- [ ] Обработка всех типов ответов
- [ ] Валидация
- [ ] Тесты

### 4.2 Frontend (web/)
- [ ] Unified JSON рендеринг
- [ ] VueFlow интеграция
- [ ] Сессии UI

---

## 5. Документация

### 5.1 Планы
- [x] simulation-framework-plan.md
- [x] unified-json-frontend-framework-plan.md
- [x] actions-simulation-plan.md
- [ ] **unfinished-items-checklist.md** (этот файл)

### 5.2 API
- [ ] action-api.md - обновить
- [ ] entry-points.md - обновить

---

## Приоритеты

### Высокий приоритет (сделать в первую очередь):
1. **План 1:** Доработать скрипты (sim:run-all ✅, sim:validate, sim:compare, sim:report)
2. **План 2:** Создать 3-5 реальных симуляций (analyze-full, generate-crud, graph-build) ✅ - УЖЕ СОЗДАНЫ
3. **План 3:** Создать TypeScript типы

### Средний приоритет:
4. Интеграция с фронтендом
5. Обработка ошибок в сервере

### Низкий приоритет:
6. Полная документация
7. E2E тесты

---

## Детальные планы

См. [IMPLEMENTATION_PLANS.md](IMPLEMENTATION_PLANS.md)

---

**Дата создания:** 2026-02-25
**Статус:** Активный
