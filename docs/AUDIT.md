# PHASE 0 — Clone & Audit (`bolt.diy` → `a2a-operator-ui`)

## Цель

Зафиксировать, какие части `bolt.diy` будут **удалены / оставлены / заглушены**, прежде чем начинать адаптацию под A2A (A/B/C, async-only, action-key shape, router two-beats).

## Воспроизводимые доказательства Ф0

- **Repo**: `a2a-operator-ui` (clone `stackblitz-labs/bolt.diy`, branch `stable`).
- **Install**: `pnpm install` — завершился успешно.
- **Build**: `pnpm run build` — **exit 0**.
  - Наблюдения: в логе есть предупреждения Vite/Unocss и сообщения sourcemap (`Can't resolve original location of error`) — но сборка дошла до `✓ built` для client и SSR bundles и завершилась с кодом 0.

## Прочитанные файлы (без правок кода)

- `app/root.tsx`
- `app/components/chat/BaseChat.tsx`
- `app/components/workbench/Workbench.client.tsx`
- `app/components/workbench/DiffView.tsx`
- `app/lib/stores/chat.ts`
- `app/lib/stores/workbench.ts`
- `app/routes/api.chat.ts`
- `app/lib/hooks/useMessageParser.ts`
- `app/lib/hooks/usePromptEnhancer.ts`
- `app/components/workbench/EditorPanel.tsx`

## Решения (таблица)

| Файл/директорій | Рішення | Причина |
|---|---|---|
| `app/lib/runtime/` | ВИДАЛИТИ | WebContainer/bolt-runtime не потрібен; A2A operator UI не має виконувати код в браузері. |
| `app/lib/modules/llm/` | ВИДАЛИТИ | LLM виклики має робити A2A стек (Client API → a2a-server → AI Hub), а не UI. |
| `app/components/@settings/providers/` | ВИДАЛИТИ | Model/provider picker у UI не потрібен (джерело правди — A2A/AI Hub налаштування). |
| `app/components/deploy/` | ВИДАЛИТИ | Deploy UX не входить в A2A operator UI (контроль через Task Monitor/артефакти). |
| `app/components/git/` | ВИДАЛИТИ | Git UI не потрібен; операторські дії — поза UI або через A2A execute/tool-chain. |
| `app/lib/hooks/useMessageParser*` | ВИДАЛИТИ | Парсить bolt-теги (`StreamingMessageParser` з `~/lib/runtime/message-parser`) і викликає runtime actions; A2A transport інший. |
| `app/lib/hooks/usePromptEnhancer*` | ВИДАЛИТИ | LLM enhance в UI не потрібен; це або server-side Gray Room, або окремий A2A action. |
| `app/routes/api.chat.ts` | STUB (410) | Bolt chat API/LLM streaming не використовується; замінюється на A2A Client API session dialog. |
| `app/components/workbench/DiffView*` | ЗАЛИШИТИ | Потрібно для показу дифів змін агента (візуалізація результатів). |
| `app/components/workbench/EditorPanel*` | ЗАЛИШИТИ | CodeMirror/панель потрібні для DiffView/огляду файлів. |
| `app/components/chat/` | ЗАЛИШИТИ+адапт | UI “чат” лишається як operator surface, але transport переписується на A2A `/api/a2a/*` (session `/next` + `/async`). |
| `app/lib/stores/chat.ts` | ЗАЛИШИТИ+адапт | Додати поля сесій/asyncPending/promiseStatus/step/stage під A2A. |
| `app/lib/stores/workbench.ts` | ЗАЛИШИТИ+адапт | Вирізати `webcontainer`/runtime runner, але залишити структури для файлів/дифів/перегляду артефактів. |
| `react-resizable-panels` | НЕ ЧІПАТИ | Layout критичний для UX (workbench + diff). |

## Примечания по наблюдениям (для следующей фазы)

1) `BaseChat.tsx` тянет очень много bolt-специфики: model selector, deploy/supabase/git, `ActionRunner` и runtime hooks. Для A2A их придётся либо удалить, либо заменить на отображение A2A `execute.form`/`messages`/артефактов.

2) `Workbench.client.tsx` напрямую зависит от `~/lib/runtime/action-runner` и `workbenchStore` который зависит от `webcontainer`. Это ключевая зона “вырезать runtime”, сохранив Diff/Editor UX.

3) `api.chat.ts` — полноценный LLM streaming endpoint с `.server/llm/*`. В A2A operator UI его нужно заменить на thin proxy/redirect к A2A Client API (или вернуть 410, если transport будет только через websocket/другой слой).

