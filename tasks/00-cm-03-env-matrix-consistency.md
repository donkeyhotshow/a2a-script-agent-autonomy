# CM-03: Verify Production Env Matrix Consistency

## Status
- [x] Done (2026-03-27)

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
- Матрица окружений добавлена: `docs/ENV-MATRIX.md` (dev/CI/prod для URL, auth flags, polling budgets)
- Root `.env.example` синхронизирован с server polling baseline (`POLL_TIMEOUT_MS=3600000`) и содержит `A2A_SERVER_URL`
- Критичные переменные (`A2A_SERVER_URL`, `AI_HUB_URL`, `SKIP_AUTH`, `DEFAULT_SYNC_MODE`, `LLM_POLL_*`, `PROMISE_TTL_SECONDS`) сведены в единый cross-module baseline