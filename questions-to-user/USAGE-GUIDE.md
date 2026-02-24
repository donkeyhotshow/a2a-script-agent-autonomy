# Ask Question Script - Human-in-the-Loop Decision Making

## Предназначение

**ask-question.ps1** - критически важный компонент для обеспечения 100% уверенности в принятии решений при автоматизированной обработке кода.

### Проблема
AI-агенты могут выполнять сложные задачи автоматически, но в критических моментах требуется подтверждение человека:
- Удаление файлов
- Рефакторинг критичного кода
- Изменение архитектуры
- Выбор между несколькими стратегиями
- Разрешение конфликтов

### Решение
Скрипт создает **синхронную точку взаимодействия** между AI и человеком:
1. AI останавливает выполнение
2. Открывается окно браузера с вопросом
3. Человек быстро отвечает
4. AI получает ответ и продолжает работу

## Архитектура взаимодействия

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Workflow                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Analyze code                                             │
│  2. Detect critical decision point                           │
│  3. ┌──────────────────────────────────────┐                │
│     │ PAUSE: Need human confirmation       │                │
│     │                                       │                │
│     │ Execute: ask-question.ps1 -Id "q1"   │                │
│     │                                       │                │
│     │ ⏸️  BLOCKED - Waiting for answer...   │                │
│     └──────────────────────────────────────┘                │
│                          │                                    │
│                          ▼                                    │
│     ┌──────────────────────────────────────┐                │
│     │  🌐 Browser opens (MS Edge)          │                │
│     │                                       │                │
│     │  ┌────────────────────────────────┐  │                │
│     │  │  Question: Delete old files?   │  │                │
│     │  │                                 │  │                │
│     │  │  ○ Yes, delete                 │  │                │
│     │  │  ● No, keep                    │  │                │
│     │  │                                 │  │                │
│     │  │  [Save Answer]                 │  │                │
│     │  └────────────────────────────────┘  │                │
│     │                                       │                │
│     │  👤 Human answers in 5 seconds       │                │
│     └──────────────────────────────────────┘                │
│                          │                                    │
│                          ▼                                    │
│     ┌──────────────────────────────────────┐                │
│     │ ✅ Answer received: "No, keep"       │                │
│     │                                       │                │
│     │ Script returns result to AI          │                │
│     └──────────────────────────────────────┘                │
│                          │                                    │
│                          ▼                                    │
│  4. AI processes answer                                      │
│  5. Continue with chosen strategy                            │
│  6. Complete task                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Сценарии применения

### Сценарий 1: Критическое удаление файлов

```javascript
// AI Agent code
async function cleanupProject() {
  const oldFiles = findOldFiles();
  
  if (oldFiles.length > 10) {
    // 🚨 Critical decision - ask human
    const answer = await askQuestion('confirm-delete-files');
    
    if (answer === 'Yes, delete all') {
      deleteFiles(oldFiles);
    } else if (answer === 'No, keep all') {
      console.log('Keeping files as requested');
    } else if (answer === 'Let me review manually') {
      showFileList(oldFiles);
      return; // Stop automation
    }
  }
}
```

**Вопрос (questions.json):**
```json
{
  "id": "confirm-delete-files",
  "type": "radio",
  "question": "Found 15 old files. What should I do?",
  "options": [
    "Yes, delete all",
    "No, keep all",
    "Let me review manually"
  ]
}
```

### Сценарий 2: Выбор стратегии рефакторинга

```javascript
// AI Agent code
async function refactorComponent() {
  const component = analyzeComponent('UserForm.vue');
  const strategies = [
    'Extract to composable',
    'Split into smaller components',
    'Keep as is, add comments'
  ];
  
  // 🤔 Multiple valid approaches - ask human
  const answer = await askQuestion('refactor-strategy');
  
  switch (answer) {
    case 'Extract to composable':
      extractToComposable(component);
      break;
    case 'Split into smaller components':
      splitComponent(component);
      break;
    case 'Keep as is, add comments':
      addDocumentation(component);
      break;
  }
}
```

### Сценарий 3: Итеративное уточнение

```javascript
// AI Agent code
async function generateTests() {
  let testStyle = await askQuestion('test-style');
  
  // Generate tests
  const tests = generateTestCode(testStyle);
  
  // Show preview and ask for confirmation
  const confirmed = await askQuestion('confirm-tests');
  
  if (confirmed === 'Yes, apply') {
    writeTests(tests);
  } else if (confirmed === 'No, regenerate') {
    // Ask for more details
    const details = await askQuestion('test-details');
    // Regenerate with new requirements
    return generateTests();
  }
}
```

### Сценарий 4: Разрешение конфликтов

```javascript
// AI Agent code
async function mergeChanges() {
  const conflicts = detectConflicts();
  
  for (const conflict of conflicts) {
    // Show conflict and ask how to resolve
    const resolution = await askQuestion(`conflict-${conflict.id}`);
    
    if (resolution === 'Keep mine') {
      applyMyVersion(conflict);
    } else if (resolution === 'Keep theirs') {
      applyTheirVersion(conflict);
    } else if (resolution === 'Manual merge') {
      openMergeTool(conflict);
      return; // Stop automation
    }
  }
}
```

## Интеграция с AI агентами

### Node.js Integration

```javascript
// lib/human-input.js
const { execSync } = require('child_process');
const path = require('path');

class HumanInput {
  constructor() {
    this.scriptPath = path.join(__dirname, '../ask-question.ps1');
  }
  
  /**
   * Ask human a question and wait for answer
   * @param {string} questionId - Question ID from questions.json
   * @param {number} timeout - Timeout in seconds (default: 600)
   * @returns {Promise<any>} Answer from human
   */
  async ask(questionId, timeout = 600) {
    try {
      const result = execSync(
        `powershell -ExecutionPolicy Bypass -File "${this.scriptPath}" -QuestionId "${questionId}"`,
        { 
          encoding: 'utf8',
          timeout: timeout * 1000,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      );
      
      // Extract JSON from output
      const jsonMatch = result.match(/\{.*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return data.answer;
      }
      
      throw new Error('No answer received');
    } catch (error) {
      if (error.killed) {
        throw new Error(`Timeout: No answer received within ${timeout} seconds`);
      }
      throw error;
    }
  }
  
  /**
   * Ask multiple questions in sequence
   */
  async askSequence(questionIds) {
    const answers = {};
    for (const id of questionIds) {
      answers[id] = await this.ask(id);
    }
    return answers;
  }
  
  /**
   * Ask question with conditional logic
   */
  async askConditional(questionId, condition) {
    if (condition()) {
      return await this.ask(questionId);
    }
    return null;
  }
}

module.exports = new HumanInput();
```

### Usage in AI Agent

```javascript
// agent.js
const humanInput = require('./lib/human-input');

class CodeRefactoringAgent {
  async run(task) {
    console.log('🤖 Analyzing code...');
    const analysis = await this.analyzeCode(task.file);
    
    console.log('🤖 Found potential improvements');
    
    // 🚨 Critical decision point
    console.log('⏸️  Asking human for confirmation...');
    const strategy = await humanInput.ask('refactor-strategy');
    
    console.log(`✅ Human chose: ${strategy}`);
    console.log('🤖 Applying changes...');
    
    await this.applyStrategy(strategy, analysis);
    
    console.log('✅ Task completed');
  }
}
```

### Example Output

```
🤖 Analyzing code...
🤖 Found potential improvements
⏸️  Asking human for confirmation...

[Browser window opens]
[Human answers in 3 seconds]

✅ Human chose: Extract to composable
🤖 Applying changes...
  - Created composables/useUserForm.ts
  - Updated UserForm.vue
  - Added imports
✅ Task completed
```

## Best Practices

### 1. Когда использовать

✅ **ИСПОЛЬЗУЙ** для:
- Удаление/перемещение файлов
- Изменение публичных API
- Выбор между равнозначными стратегиями
- Критические рефакторинги
- Разрешение конфликтов

❌ **НЕ ИСПОЛЬЗУЙ** для:
- Форматирование кода
- Добавление комментариев
- Простые переименования
- Автоматические исправления

### 2. Формулировка вопросов

✅ **Хорошо:**
```json
{
  "question": "Found 15 unused imports. Delete them?",
  "options": ["Yes, delete all", "No, keep all", "Show me the list"]
}
```

❌ **Плохо:**
```json
{
  "question": "What to do?",
  "options": ["Yes", "No"]
}
```

### 3. Таймауты

```javascript
// Short timeout for simple questions
await humanInput.ask('confirm-format', 60); // 1 minute

// Long timeout for complex decisions
await humanInput.ask('architecture-choice', 600); // 10 minutes

// No timeout for critical decisions
await humanInput.ask('delete-database', 3600); // 1 hour
```

### 4. Fallback стратегии

```javascript
async function safeRefactor() {
  try {
    const answer = await humanInput.ask('refactor-confirm', 300);
    return applyRefactor(answer);
  } catch (error) {
    if (error.message.includes('Timeout')) {
      // Fallback: safe default
      console.log('⚠️  No answer - using safe default');
      return applySafeDefault();
    }
    throw error;
  }
}
```

## Workflow Patterns

### Pattern 1: Confirm-Execute

```javascript
async function confirmExecute(action, questionId) {
  const confirmed = await humanInput.ask(questionId);
  if (confirmed === 'Yes') {
    await action();
  }
}
```

### Pattern 2: Choose-Strategy

```javascript
async function chooseStrategy(strategies, questionId) {
  const choice = await humanInput.ask(questionId);
  const strategy = strategies.find(s => s.name === choice);
  return strategy.execute();
}
```

### Pattern 3: Iterative-Refinement

```javascript
async function iterativeRefinement() {
  let satisfied = false;
  while (!satisfied) {
    const result = await generateCode();
    const feedback = await humanInput.ask('review-code');
    
    if (feedback === 'Approve') {
      satisfied = true;
    } else {
      // Refine based on feedback
      await refineCode(feedback);
    }
  }
}
```

### Pattern 4: Multi-Step-Confirmation

```javascript
async function multiStepTask() {
  // Step 1: Choose approach
  const approach = await humanInput.ask('choose-approach');
  
  // Step 2: Confirm details
  const details = await humanInput.ask('confirm-details');
  
  // Step 3: Final confirmation
  const final = await humanInput.ask('final-confirm');
  
  if (final === 'Yes') {
    await executeTask(approach, details);
  }
}
```

## Преимущества

### 1. Синхронность
- AI **блокируется** до получения ответа
- Гарантированная последовательность действий
- Нет race conditions

### 2. Скорость
- Человек отвечает за 3-10 секунд
- Минимальное прерывание workflow
- Браузер открывается мгновенно

### 3. Надежность
- 100% уверенность в критических решениях
- Человек видит полный контекст
- Возможность отменить операцию

### 4. Гибкость
- Любые типы вопросов (radio, checkbox, text)
- Условная логика
- Итеративное уточнение

## Заключение

**ask-question.ps1** - это мост между автоматизацией и контролем человека. Он позволяет AI агентам работать автономно, но запрашивать подтверждение в критических моментах, обеспечивая баланс между скоростью и безопасностью.

**Ключевой принцип:** AI делает всю рутинную работу, но человек принимает критические решения.
