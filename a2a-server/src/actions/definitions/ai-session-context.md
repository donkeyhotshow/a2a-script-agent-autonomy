# AI Session Context System

> AI Session Context - Сохранение и использование контекста из предыдущих сессий

## Description

Система для сохранения и использования контекста из предыдущих сессий при работе с новыми задачами. AI создаёт документ на каждую входящую задачу и за первую итерацию выводит до состояния плана изучения проблемы.

## Priority

90

## Context

```json
{
  "type": "session_context",
  "creates_files": true,
  "llm_guided": true,
  "iterations": "multiple"
}
```

## Triggers

- "сохрани контекст"
- "запомни"
- "new session"
- "new task context"
- "создай сессию"
- "контекст изучения"
- "план изучения"
- "ai session"
- "ai context"

## SubActions

### Step 1: capture-task
**Title:** Захват входящей задачи
**Input:** user_message, session_id
**Output:** captured_task

```typescript
export default async function captureTask(input: { 
  userMessage: string;
  sessionId: string;
}) {
  // Создаём базовую структуру задачи
  const task = {
    id: `task_${Date.now()}`,
    session_id: input.sessionId,
    original_message: input.userMessage,
    created_at: new Date().toISOString(),
    status: 'captured',
    iterations: 0
  };
  
  return { captured_task: task };
}
```

### Step 2: analyze-intent
**Title:** Анализ намерения и типа задачи
**Input:** captured_task
**Output:** intent_analysis

```typescript
export default async function analyzeIntent(input: { captured_task: any }) {
  const message = input.captured_task.original_message.toLowerCase();
  
  // Определяем тип задачи
  let taskType = 'general';
  let complexity = 'medium';
  let requiresAnalysis = true;
  
  const typePatterns = {
    create: ['создай', 'добавь', 'new', 'create', 'generate'],
    analyze: ['анализ', 'проверь', 'найди проблемы', 'analyze', 'check'],
    fix: ['исправь', 'почини', 'fix', 'resolve'],
    refactor: ['рефакторинг', 'улучши', 'refactor', 'improve'],
    explain: ['объясни', 'расскажи', 'покажи', 'explain', 'show'],
    search: ['найди', 'поиск', 'search', 'find']
  };
  
  for (const [type, patterns] of Object.entries(typePatterns)) {
    if (patterns.some(p => message.includes(p))) {
      taskType = type;
      break;
    }
  }
  
  // Определяем сложность
  if (message.includes('архитектур') || message.includes('architecture')) {
    complexity = 'high';
  } else if (message.length > 500) {
    complexity = 'medium';
  }
  
  return {
    intent_analysis: {
      task_type: taskType,
      complexity,
      requires_analysis: requiresAnalysis,
      keywords: message.split(/\s+/).filter(w => w.length > 3)
    }
  };
}
```

### Step 3: collect-session-context
**Title:** Сбор контекста из предыдущих сессий
**Input:** intent_analysis
**Output:** session_context

```typescript
export default async function collectSessionContext(input: { 
  intent_analysis: any;
  projectId?: string;
}) {
  // Контекст передаётся от клиента в incoming context
  // Сервер не хранит, только обрабатывает переданное
  
  const previousContexts = input.intent_analysis.previous_contexts || [];
  const relevantHistory = [];
  
  // Ищем релевантный контекст из предыдущих сессий
  for (const ctx of previousContexts) {
    // Простой поиск по ключевым словам
    const hasOverlap = ctx.keywords?.some(
      k => input.intent_analysis.keywords.includes(k)
    );
    if (hasOverlap || ctx.session_id === input.intent_analysis.related_session) {
      relevantHistory.push(ctx);
    }
  }
  
  return {
    session_context: {
      previous_sessions: relevantHistory,
      has_history: relevantHistory.length > 0,
      context_summary: relevantHistory.map(c => c.summary).join('\n')
    }
  };
}
```

### Step 4: llm-first-iteration
**Title:** Первая итерация - LLM анализ и план
**Input:** captured_task, intent_analysis, session_context
**Output:** study_plan

```typescript
export default async function llmFirstIteration(input: { 
  captured_task: any;
  intent_analysis: any;
  session_context: any;
}) {
  // Формируем промпт для LLM
  const systemPrompt = `Ты - AI ассистент для анализа задач разработчика.
Твоя задача за ПЕРВУЮ итерацию создать "план изучения проблемы".

План изучения должен включать:
1. Понимание задачи - что нужно сделать
2. Анализ текущего состояния - что есть сейчас
3. Определение области - какие файлы/компоненты затрагиваются
4. План действий - следующие шаги

Будь краток и структурирован.`;

  const userPrompt = `
Задача: ${input.captured_task.original_message}

Тип задачи: ${input.intent_analysis.task_type}
Сложность: ${input.intent_analysis.complexity}

${input.session_context.has_history ? 'Предыдущий контекст:\n' + input.session_context.context_summary : 'Нет предыдущего контекста'}

Создай план изучения проблемы.
`;

  // Вызов LLM
  const llmResponse = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  });
  
  // Парсим ответ в структурированный план
  const studyPlan = parseStudyPlan(llmResponse);
  
  return {
    study_plan: {
      ...studyPlan,
      task_id: input.captured_task.id,
      iteration: 1,
      created_at: new Date().toISOString(),
      status: 'in_progress'
    }
  };
}

function parseStudyPlan(response: string) {
  // Простой парсинг - делим на секции
  const sections = response.split(/## |### |\n\n/);
  
  return {
    understanding: sections.find(s => s.toLowerCase().includes('понимание') || s.toLowerCase().includes('understanding')) || '',
    current_state: sections.find(s => s.toLowerCase().includes('текущ') || s.toLowerCase().includes('current')) || '',
    scope: sections.find(s => s.toLowerCase().includes('область') || s.toLowerCase().includes('scope')) || '',
    action_plan: sections.find(s => s.toLowerCase().includes('план') || s.toLowerCase().includes('plan')) || '',
    raw_response: response
  };
}
```

### Step 5: create-context-document
**Title:** Создание документа контекста
**Input:** captured_task, intent_analysis, study_plan
**Output:** context_document

```typescript
export default async function createContextDocument(input: { 
  captured_task: any;
  intent_analysis: any;
  study_plan: any;
}) {
  // Создаём markdown документ контекста
  const document = `# AI Session Context

## Task
- **ID:** ${input.study_plan.task_id}
- **Session:** ${input.captured_task.session_id}
- **Created:** ${input.study_plan.created_at}
- **Status:** ${input.study_plan.status}

## Intent Analysis
- **Type:** ${input.intent_analysis.task_type}
- **Complexity:** ${input.intent_analysis.complexity}
- **Keywords:** ${input.intent_analysis.keywords.join(', ')}

---

## Plan Study (Iteration 1)

### Understanding
${input.study_plan.understanding}

### Current State  
${input.study_plan.current_state}

### Scope
${input.study_plan.scope}

### Action Plan
${input.study_plan.action_plan}

---

*Generated by AI Session Context System*
`;

  return {
    context_document: {
      id: `ctx_${input.study_plan.task_id}`,
      content: document,
      task_id: input.study_plan.task_id,
      iteration: 1
    }
  };
}
```

---

## Flow Diagram

```
User Task Input
      │
      ▼
┌─────────────────┐
│  capture-task   │ ───► captured_task
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ analyze-intent  │ ───► intent_analysis
└─────────────────┘
      │
      ▼
┌─────────────────────┐
│ collect-session-    │ ───► session_context
│ context             │     (from client)
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ llm-first-iteration │ ───► study_plan
└─────────────────────┘
      │
      ▼
┌──────────────────────┐
│ create-context-      │ ───► context_document
│ document             │
└──────────────────────┘
      │
      ▼
   Return to Client
   (document in response)
```

## Notes

- **Server creates files** - Это приложение агента, сервер создаёт документы контекста
- **No persistence** - Документы возвращаются клиенту, сервер не хранит
- **Multiple iterations** - Система может продолжать итерации для детального изучения
- **Client provides history** - Клиент передаёт контекст из предыдущих сессий

## Related Actions

- `context-query` - Поиск релевантного контекста
- `ai-fallback` - Generic AI обработка
