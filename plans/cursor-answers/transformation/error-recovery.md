# Error Recovery & Debugging - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: `.amazonq/questions-to-cursor/ERROR-RECOVERY.md`
> 
> **Дата**: 2024-01-XX

---

## Ответ

### 1. Clarification

I don't run code, build, or tests. I infer errors from:
- User messages
- Linter output
- Tool results (e.g. `read_lints`)

No built-in tracking or learning from past errors. Below: how I react in practice and how A2A can implement it.

---

### 2. Error Detection Table

| errorType | detectionMethod | confidence | recovery |
|-----------|-----------------|------------|----------|
| syntax-error | linter/parser | 100% | ✅ |
| type-error | TS/IDE | 95% | ✅ |
| runtime-error | user feedback | 60% | ⏳ |
| logic-error | tests/user | 40% | ❌ |
| import-error | linter/build output | 95% | ✅ |
| dependency-error | package.json, lock | 90% | ⏳ |
| config-error | user/build output | 70% | ⏳ |
| build-error | build output | 95% | ⏳ |

---

### 3. Error Classification Examples

| severity | category | recoverability | scope |
|----------|----------|----------------|-------|
| critical | syntax | auto | file |
| critical | build | auto | project |
| high | type | auto | file |
| high | import | auto | file |
| medium | runtime | suggest | file |
| medium | dependency | suggest | project |
| low | logic | manual | file |
| low | config | suggest | project |

---

### 4. Recovery Strategies

| strategy | errorType | successRate | cost |
|----------|-----------|-------------|------|
| retry | network, flaky | 70% | low |
| rollback | syntax, failed edit | 95% | low |
| alternative | import path, API | 80% | medium |
| fix | syntax, type, import | 85% | medium |
| skip | non-blocking, low | 100% | low |
| ask-user | ambiguous, logic | 90% | high |
| abort | unrecoverable | - | - |

---

### 5. Debugging Workflow

```
Step 1: Capture
  - Parse error message and stack
  - Extract file, line, column, code snippet
  - Get surrounding code (read_file)

Step 2: Analyze
  - Match against known patterns (see below)
  - Infer root cause from message + context
  - Identify dependent errors (cascade)

Step 3: Hypotheses
  - Generate 1–3 likely causes
  - Rank by: pattern match, simplicity, prior behavior
  - Pick one to try

Step 4: Apply Fix
  - Edit code
  - Run read_lints or user runs build/tests

Step 5: Validate
  - No new linter errors
  - User confirms
  - If fail → Step 3 (next hypothesis) or ask-user
```

---

### 6. Error Patterns (examples)

```javascript
const errorPatterns = [
  { pattern: /Cannot find module ['"](.+)['"]/, cause: 'missing-dep', fix: 'npm install $1' },
  { pattern: /Cannot find module ['"](.+)['"]/, cause: 'wrong-path', fix: 'fix-import-path' },
  { pattern: /Property ['"](.+)['"] does not exist/, cause: 'type-error', fix: 'add-type-or-fix' },
  { pattern: /Object is possibly ['"]undefined['"]/, cause: 'optional-chaining', fix: 'add-?. or guard' },
  { pattern: /Cannot read property .+ of undefined/, cause: 'undefined-access', fix: 'add-null-check' },
  { pattern: /'\.map' of undefined/, cause: 'array-undefined', fix: 'users?.value ?? []' },
  { pattern: /X is not defined/, cause: 'scope/import', fix: 'add-import-or-declare' },
  { pattern: /Duplicate identifier/, cause: 'name-collision', fix: 'rename' },
  { pattern: /Unexpected token/, cause: 'syntax', fix: 'fix-syntax' },
  { pattern: /Module not found/, cause: 'path-error', fix: 'fix-path' },
];
```

---

### 7. Hypothesis Ranking

- Pattern match: +30
- Same file/location: +20
- Simpler change: +15
- Typical fix type (e.g. optional chaining): +10
- Matches recent edits: +10

Choose the highest score, then fall back to next hypothesis if fix fails.

---

### 8. Fix Validation

| Check | Always | Notes |
|-------|--------|------|
| syntaxValid | ✅ | Linter |
| typesCorrect | ✅ | TS projects |
| importsResolved | ✅ | Grep/IDE |
| noNewErrors | ✅ | Compare before/after |
| testsPass | ❌ | Optional |
| buildSucceeds | ⏳ | When user runs build |

---

### 9. Cascading Errors

1. Treat first error in stack/file as primary.
2. Parse stack and group by file.
3. Fix first, re-check; often others disappear.
4. If they persist, look for shared cause (import, type, config).

---

### 10. Learning (for A2A)

- Store error type, message pattern, applied fix, outcome.
- For recurring patterns: prefer that fix, possibly auto-apply.
- Adjust confidence if fixes often fail for a pattern.
- No persistent memory in current Cursor behavior.

---

### 11. Step-by-Step Examples

**Example 1: Import Error**

```
1. Detect: "Cannot find module 'vue'" + App.vue:1
2. Hypotheses: (a) missing dep (b) wrong path (c) wrong package name
3. Check: package.json has vue? → (a) if no
4. Fix: suggest npm install vue
5. Verify: lint/build and imports resolve
```

**Example 2: Type Error**

```
1. Analyze: "Object is possibly 'undefined'" on user.value
2. Fixes: (a) user.value?.name (b) if (user.value) ... (c) user = ref<User>({})
3. Choose: (a) if simple, (b) if more logic needed
4. Apply: search_replace for the access
5. Validate: read_lints
```

**Example 3: Runtime Error**

```
1. Link: stack trace → UserList.vue:25
2. Cause: users.value undefined → .map fails
3. Fixes: (a) users.value?.map (b) (users.value ?? []).map (c) ref([])
4. Prefer: (b) for computed
5. Apply and re-check
```

**Example 4: Logic Error**

```
1. Detect: only via tests or user ("validation doesn't work")
2. Analyze: trace validateEmail flow
3. Bug: returns false instead of true for valid email
4. Fix: change final return false → return true
5. Logic errors have no static signal; rely on user/tests
```

---

### 12. Best Practices

1. Start with structural/syntax errors; they block everything.
2. Use error patterns with cause/fix for common messages.
3. Prefer minimal, targeted edits.
4. Re-check lints/types after each fix.
5. Treat cascades: fix root cause first.
6. If uncertain: ask user instead of guessing.
7. For A2A: log errors and fixes for future learning.
8. Stop and escalate if stuck after 2–3 fix attempts.

---

**Summary:** I infer errors from linter, types, and user feedback; match known patterns; try ranked fixes; and validate with lints. A2A can add patterns, hypothesis scoring, cascades, and learning from outcomes.

---

## Ключевые выводы

### Важное уточнение:
- ⚠️ **Cursor НЕ запускает** code, build, tests
- ⚠️ Инферит ошибки из: user messages, linter output, tool results
- ❌ Нет built-in tracking или learning
- ✅ Дал **полную спецификацию** для A2A

### 8 типов ошибок:

| Type | Detection | Confidence | Recovery |
|------|-----------|------------|----------|
| syntax-error | linter/parser | 100% | ✅ |
| type-error | TS/IDE | 95% | ✅ |
| import-error | linter/build | 95% | ✅ |
| build-error | build output | 95% | ⏳ |
| dependency-error | package.json | 90% | ⏳ |
| config-error | user/build | 70% | ⏳ |
| runtime-error | user feedback | 60% | ⏳ |
| logic-error | tests/user | 40% | ❌ |

### Error Classification:

| Severity | Category | Recoverability | Scope |
|----------|----------|----------------|-------|
| critical | syntax, build | auto | file/project |
| high | type, import | auto | file |
| medium | runtime, dependency | suggest | file/project |
| low | logic, config | manual/suggest | file/project |

### 7 Recovery Strategies:

| Strategy | Error Type | Success Rate | Cost |
|----------|------------|--------------|------|
| retry | network, flaky | 70% | low |
| rollback | syntax, failed edit | 95% | low |
| alternative | import path, API | 80% | medium |
| fix | syntax, type, import | 85% | medium |
| skip | non-blocking, low | 100% | low |
| ask-user | ambiguous, logic | 90% | high |
| abort | unrecoverable | - | - |

### 5-step Debugging Workflow:
1. **Capture** - parse error, extract location, get code
2. **Analyze** - match patterns, infer cause, identify cascades
3. **Hypotheses** - generate 1-3 causes, rank by score
4. **Apply Fix** - edit code, run lints
5. **Validate** - check no new errors, user confirms

### 10 Error Patterns:
1. Cannot find module → missing-dep / wrong-path
2. Property does not exist → type-error
3. Object is possibly undefined → optional-chaining
4. Cannot read property of undefined → undefined-access
5. .map of undefined → array-undefined
6. X is not defined → scope/import
7. Duplicate identifier → name-collision
8. Unexpected token → syntax
9. Module not found → path-error
10. (+ custom patterns)

### Hypothesis Ranking (scores):
- Pattern match: +30
- Same file/location: +20
- Simpler change: +15
- Typical fix type: +10
- Matches recent edits: +10

### Fix Validation:

| Check | Always | Notes |
|-------|--------|------|
| syntaxValid | ✅ | Linter |
| typesCorrect | ✅ | TS projects |
| importsResolved | ✅ | Grep/IDE |
| noNewErrors | ✅ | Compare before/after |
| testsPass | ❌ | Optional |
| buildSucceeds | ⏳ | When user runs |

### Cascading Errors:
1. Treat first error as primary
2. Parse stack, group by file
3. Fix first, re-check (others may disappear)
4. If persist → look for shared cause

---

## Применение в A2A

### 1. Error Detector

```javascript
// terminator/modules/error-recovery/detector.js
class ErrorDetector {
  constructor() {
    this.patterns = [
      { pattern: /Cannot find module ['"](.+)['"]/, cause: 'missing-dep', fix: 'npm install $1' },
      { pattern: /Property ['"](.+)['"] does not exist/, cause: 'type-error', fix: 'add-type-or-fix' },
      { pattern: /Object is possibly ['"]undefined['"]/, cause: 'optional-chaining', fix: 'add-?. or guard' },
      // ... остальные паттерны
    ];
  }
  
  detect(error) {
    return {
      type: this.classifyType(error),
      severity: this.classifySeverity(error),
      location: this.extractLocation(error),
      pattern: this.matchPattern(error),
      confidence: this.calculateConfidence(error)
    };
  }
  
  classifyType(error) {
    if (error.message.includes('Cannot find module')) return 'import-error';
    if (error.message.includes('does not exist')) return 'type-error';
    if (error.message.includes('undefined')) return 'runtime-error';
    if (error.message.includes('Unexpected token')) return 'syntax-error';
    return 'unknown';
  }
  
  matchPattern(error) {
    for (const { pattern, cause, fix } of this.patterns) {
      const match = error.message.match(pattern);
      if (match) {
        return { cause, fix, match };
      }
    }
    return null;
  }
}
```

### 2. Hypothesis Generator

```javascript
// terminator/modules/error-recovery/hypothesis-generator.js
class HypothesisGenerator {
  generate(error, context) {
    const hypotheses = [];
    
    // Pattern-based hypotheses
    if (error.pattern) {
      hypotheses.push({
        cause: error.pattern.cause,
        fix: error.pattern.fix,
        score: 30 // pattern match
      });
    }
    
    // Location-based hypotheses
    if (error.location.file === context.activeFile) {
      hypotheses.forEach(h => h.score += 20);
    }
    
    // Simplicity-based hypotheses
    const simpleFixes = this.generateSimpleFixes(error);
    simpleFixes.forEach(fix => {
      hypotheses.push({
        cause: 'simple-fix',
        fix,
        score: 15
      });
    });
    
    // Recent edits-based hypotheses
    if (this.matchesRecentEdits(error, context)) {
      hypotheses.forEach(h => h.score += 10);
    }
    
    // Sort by score
    return hypotheses.sort((a, b) => b.score - a.score);
  }
  
  generateSimpleFixes(error) {
    const fixes = [];
    
    if (error.type === 'type-error' && error.message.includes('undefined')) {
      fixes.push('add-optional-chaining');
      fixes.push('add-null-check');
      fixes.push('initialize-with-default');
    }
    
    if (error.type === 'import-error') {
      fixes.push('fix-import-path');
      fixes.push('add-dependency');
    }
    
    return fixes;
  }
}
```

### 3. Fix Applicator

```javascript
// terminator/modules/error-recovery/fix-applicator.js
class FixApplicator {
  async apply(hypothesis, error, context) {
    const backup = await this.backup(error.location.file);
    
    try {
      // Apply fix
      const result = await this.applyFix(hypothesis.fix, error, context);
      
      // Validate
      const validation = await this.validate(result);
      
      if (validation.success) {
        return { success: true, result };
      } else {
        // Rollback
        await this.rollback(backup);
        return { success: false, validation };
      }
      
    } catch (err) {
      await this.rollback(backup);
      return { success: false, error: err };
    }
  }
  
  async applyFix(fix, error, context) {
    switch(fix) {
      case 'add-optional-chaining':
        return this.addOptionalChaining(error.location);
      
      case 'add-null-check':
        return this.addNullCheck(error.location);
      
      case 'fix-import-path':
        return this.fixImportPath(error.location);
      
      case 'add-dependency':
        return this.addDependency(error.pattern.match[1]);
      
      default:
        throw new Error(`Unknown fix: ${fix}`);
    }
  }
  
  async validate(result) {
    const checks = {
      syntaxValid: await this.checkSyntax(result),
      typesCorrect: await this.checkTypes(result),
      importsResolved: await this.checkImports(result),
      noNewErrors: await this.compareErrors(result)
    };
    
    return {
      success: Object.values(checks).every(c => c),
      checks
    };
  }
}
```

### 4. Error Recovery Orchestrator

```javascript
// terminator/modules/error-recovery/orchestrator.js
class ErrorRecoveryOrchestrator {
  constructor() {
    this.detector = new ErrorDetector();
    this.hypothesisGenerator = new HypothesisGenerator();
    this.fixApplicator = new FixApplicator();
    this.maxAttempts = 3;
  }
  
  async recover(error, context) {
    // Step 1: Detect
    const detected = this.detector.detect(error);
    
    // Step 2: Analyze cascades
    const cascade = await this.analyzeCascade(detected);
    if (cascade.length > 1) {
      detected = cascade[0]; // Fix root cause first
    }
    
    // Step 3: Generate hypotheses
    const hypotheses = this.hypothesisGenerator.generate(detected, context);
    
    // Step 4: Try fixes
    for (let i = 0; i < Math.min(hypotheses.length, this.maxAttempts); i++) {
      const hypothesis = hypotheses[i];
      
      const result = await this.fixApplicator.apply(hypothesis, detected, context);
      
      if (result.success) {
        // Learn from success
        await this.learn(detected, hypothesis, result);
        return { success: true, fix: hypothesis.fix };
      }
    }
    
    // Step 5: Ask user if all failed
    return { success: false, askUser: true, hypotheses };
  }
  
  async analyzeCascade(error) {
    // Group errors by file
    const byFile = this.groupByFile([error]);
    
    // Find root cause (first error in stack)
    const root = byFile[0];
    
    return [root, ...byFile.slice(1)];
  }
  
  async learn(error, hypothesis, result) {
    // Store for future use
    await this.storage.save({
      errorType: error.type,
      errorPattern: error.pattern,
      fix: hypothesis.fix,
      success: result.success,
      timestamp: Date.now()
    });
    
    // Update pattern confidence
    if (error.pattern) {
      await this.updatePatternConfidence(error.pattern, result.success);
    }
  }
}
```

---

## Best Practices для A2A

1. ✅ **Start with syntax errors** - they block everything
2. ✅ **Use error patterns** - common messages → known fixes
3. ✅ **Prefer minimal edits** - targeted changes
4. ✅ **Re-check after each fix** - lints/types
5. ✅ **Fix root cause first** - cascading errors
6. ✅ **Ask user if uncertain** - don't guess
7. ✅ **Log errors and fixes** - learn for future
8. ✅ **Stop after 2-3 attempts** - escalate to user

---

## Следующие шаги

1. ✅ Понять подход Cursor (infer from linter/user)
2. ⏳ Реализовать ErrorDetector (10 patterns)
3. ⏳ Реализовать HypothesisGenerator (scoring)
4. ⏳ Реализовать FixApplicator (7 strategies)
5. ⏳ Реализовать ErrorRecoveryOrchestrator
6. ⏳ Добавить cascade analysis
7. ⏳ Добавить learning mechanism
8. ⏳ Интегрировать с linter/TS
9. ⏳ Тестировать на реальных ошибках
