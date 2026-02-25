тьAction: Диалог (AI Conversation with Tool Management)

> **Относится к:** a2a-server (actions)

## Обзор

**Action ID:** `dialog`

**Название:** Диалог с AI и управление тулзами

**Описание:** AI ведёт интерактивный диалог с пользователем, анализирует запросы и управляет тулзами (tools) по запросу. Тулзы могут включать: поиск файлов, выполнение команд, анализ кода, работа с RAG и т.д.

## Контекст

```json
{
  "type": "conversation",
  "supports_tools": true,
  "llm_mode": "conversational"
}
```

## Triggers

- "поговорим"
- "давай обсудим"
- "проконсультируй"
- "что думаешь о"
- "объясни как"
- "help me understand"
- "let's discuss"
- "ai chat"
- "консультация"

## SubActions

### Step 1: parse-intent
**Title:** Парсинг намерения пользователя
**Input:** user_message
**Output:** parsed_intent

```typescript
export default async function parseIntent(input: { message: string }) {
  const message = input.message.toLowerCase();
  
  // Определяем тип намерения
  let intent = 'general';
  let needsTools = false;
  let toolTypes: string[] = [];
  
  // Ключевые слова для определения потребности в тулзах
  const toolPatterns = {
    file_search: ['найди', 'поиск', 'file', 'search', 'где находится'],
    code_analysis: ['анализ', 'analyze', 'проверь', 'check'],
    execution: ['выполни', 'запусти', 'run', 'execute', 'сделай'],
    rag_query: ['найди в коде', 'search in code', 'relevant'],
    graph_query: ['зависимости', 'connections', 'связи', 'impact'],
  };
  
  for (const [toolType, keywords] of Object.entries(toolPatterns)) {
    if (keywords.some(kw => message.includes(kw))) {
      needsTools = true;
      toolTypes.push(toolType);
    }
  }
  
  // Определяем тип диалога
  if (message.includes('?') || message.includes('почему') || message.includes('как')) {
    intent = 'question';
  } else if (needsTools) {
    intent = 'tool_request';
  } else if (message.includes('объясни') || message.includes('расскажи')) {
    intent = 'explanation';
  }
  
  return {
    parsed_intent: {
      original: input.message,
      intent,
      needsTools,
      toolTypes,
      confidence: 0.9
    }
  };
}
```

### Step 2: collect-context
**Title:** Сбор контекста для диалога
**Input:** parsed_intent
**Output:** dialog_context

```typescript
export default async function collectContext(input: { parsed_intent: any }) {
  const { intent, needsTools, toolTypes } = input.parsed_intent;
  const context: any = {
    conversation_history: [], // передаётся от клиента
    available_tools: [],
  };
  
  if (needsTools) {
    // Собираем контекст из различных источников
    if (toolTypes.includes('file_search')) {
      context.available_tools.push('file-search', 'glob');
    }
    if (toolTypes.includes('code_analysis')) {
      context.available_tools.push('code-analysis', 'neurons');
    }
    if (toolTypes.includes('execution')) {
      context.available_tools.push('script-runner');
    }
    if (toolTypes.includes('rag_query')) {
      context.available_tools.push('rag', 'semantic-search');
    }
    if (toolTypes.includes('graph_query')) {
      context.available_tools.push('knowledge-graph');
    }
  }
  
  return { dialog_context: context };
}
```

### Step 3: llm-response
**Title:** Генерация ответа через LLM
**Input:** parsed_intent, dialog_context
**Output:** ai_response

```typescript
export default async function llmResponse(input: { 
  parsed_intent: any; 
  dialog_context: any;
  conversation_history: any[];
}) {
  const { intent, needsTools, toolTypes, original } = input.parsed_intent;
  const { available_tools } = input.dialog_context;
  
  // Формируем промпт для LLM
  let systemPrompt = `Ты - AI ассистент для разработчиков. 
Ведёшь диалог с пользователем. 
Доступные тулзы: ${available_tools.join(', ')}.
${needsTools ? 'Пользователь запросил использование тулзов: ' + toolTypes.join(', ') : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...input.conversation_history.slice(-10), // последние 10 сообщений
    { role: 'user', content: original }
  ];
  
  // Вызов LLM
  const response = await callLLM({
    messages,
    tools: needsTools ? buildToolsSpec(toolTypes) : undefined,
  });
  
  return {
    ai_response: {
      message: response.message,
      tools_to_use: response.tools_used || [],
      requires_continue: response.requires_user_confirmation
    }
  };
}
```

### Step 4: execute-tools (conditional)
**Title:** Выполнение запрошенных тулзов
**Input:** ai_response, tool_parameters
**Output:** tool_results

```typescript
export default async function executeTools(input: { 
  ai_response: any;
  project_context: any;
}) {
  const toolsToUse = input.ai_response.tools_to_use || [];
  const results = [];
  
  for (const tool of toolsToUse) {
    let result;
    
    switch (tool) {
      case 'file-search':
        result = await searchFiles(input.project_context.query);
        break;
      case 'code-analysis':
        result = await analyzeCode(input.project_context.target);
        break;
      case 'rag':
        result = await ragQuery(input.project_context.question);
        break;
      case 'knowledge-graph':
        result = await graphQuery(input.project_context.entity);
        break;
      // ... другие тулзы
    }
    
    results.push({ tool, result });
  }
  
  return { tool_results: results };
}
```

### Step 5: format-response
**Title:** Форматирование финального ответа
**Input:** ai_response, tool_results
**Output:** final_message

```typescript
export default async function formatResponse(input: { 
  ai_response: any;
  tool_results?: any[];
}) {
  let message = input.ai_response.message;
  
  // Добавляем результаты тулзов в ответ
  if (input.tool_results && input.tool_results.length > 0) {
    const toolSummary = input.tool_results
      .map(r => `📋 **${r.tool}**: ${formatResult(r.result)}`)
      .join('\n');
    
    message += '\n\n---';
    message += '\n**Результаты инструментов:**\n' + toolSummary;
  }
  
  return {
    final_message: {
      text: message,
      requires_action: input.ai_response.requires_continue,
      next_step: input.ai_response.requires_continue ? 'await_user_response' : 'complete'
    }
  };
}
```

---

## Пример диалога

**Пользователь:** "Давай обсудим как работает аутентификация в этом проекте?"

**Server → LLM:**
```
Ты - AI ассистент. Ведёшь диалог. 
Доступные тулзы: knowledge-graph, code-analysis.
```

**AI Response:**
```
Я проанализирую структуру аутентификации в проекте. 
Для этого мне нужно изучить код и граф зависимостей.
```

**Tool Execution:** graph-query (анализ связей auth модулей)

**Final Response:**
```
## Аутентификация в проекте

Система аутентификации построена на:

1. **JWT Token** - основной механизм
   - [`auth.service.ts`](...) - генерация и валидация токенов
   - [`jwt.middleware.ts`](...) - проверка на роутах

2. **OAuth Providers** (опционально)
   - Google, GitHub integration

Хотите подробнее о каком-то конкретном компоненте?
```

---

## Зависимости

| Компонент | Зависимость |
|-----------|------------|
| RAG | Для поиска релевантного кода |
| Knowledge Graph | Для анализа зависимостей |
| Neurons | Для code analysis |
| Script Runner | Для выполнения команд |
| LLM (Ollama/OpenAI) | Для генерации ответов |

## Файлы

- [`a2a-server/src/actions/definitions/dialog.md`](a2a-server/src/actions/definitions/dialog.md) — Action definition
- [`a2a-server/src/actions/definitions/auto-ai-index.ts`](a2a-server/src/actions/definitions/auto-ai-index.ts) — Добавить в индекс

## Статус

- [x] Создать dialog.md definition
- [x] Добавить в auto-ai-index.ts
- [ ] Протестировать с LLM
- [ ] Добавить поддержку новых тулзов

---

**Дата:** 2026-02-25
**Приоритет:** Высокий
