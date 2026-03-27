# CM-03: Verify Production Env Matrix Consistency

## Status
- [ ] Open

## Description
Verify production env matrix consistency across client/server/ai-integration (`A2A_SERVER_URL`, `AI_HUB_URL`, auth flags, polling budgets).

## Details
- Проверить согласованность переменных окружения между модулями
- A2A_SERVER_URL, AI_HUB_URL, auth flags, polling budgets должны быть согласованы
- Документировать матрицу для dev/CI/prod

## Source
- [DEV_STATE.md:287](../DEV_STATE.md)

## Owner
Cross-module infrastructure

## Verification
- Все модули используют согласованные env variables
- Документация матрицы существует и актуальна
- Тесты проходят с production-like env