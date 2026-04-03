# Frontend Actions Workflow - Ответ от Cursor

> **Статус**: ✅ Получен
> 
> **Вопрос**: `.amazonq/questions-to-cursor/actions/FRONTEND-WORKFLOW.md`
> 
> **Дата**: 2024-01-XX

---

## Ответ

### Clarification

I don't have an automated frontend-actions workflow. I respond to user requests and use tools when needed. There is no `FRONTEND-ACTIONS.md` in your workspace.

Below is a specification you can use to implement this in your A2A system.

---

### 1. Action Grouping

| group | actions | triggerCondition | executionOrder | frequency |
|-------|---------|------------------|----------------|-----------|
| state-detection | detect-state-management, suggest-pinia/redux | on-project-open | 1 | once/session |
| component-analysis | detect-prop-drilling, suggest-context/provide-inject | on-file-open | 2 | per-file |
| performance-check | detect-memo-opportunities, suggest-usememo/react.memo | on-save | 3 | per-save |
| performance-audit | detect-large-bundles, detect-unnecessary-rerenders | on-project-open, periodic | 4 | low |
| accessibility | detect-a11y-issues, suggest-aria | on-save | 5 | per-save |
| responsive | detect-responsive-issues, suggest-breakpoints | on-file-open | 6 | per-file |
| hooks-composables | detect-composables, suggest-extract-hook | on-file-open | 7 | per-file |
| forms | detect-form-validation, suggest-validation | on-file-open | 8 | per-file |
| routing | detect-routing-patterns, suggest-code-splitting | on-project-open | 9 | low |
| styling | detect-css-in-js, suggest-consistent-styling | on-file-open | 10 | per-file |
| animation | detect-animation-patterns, suggest-transitions | on-file-open | 11 | per-file |

---

### 2. Execution Sequence

```
Step 1: Project detection (on project open)
  → detect-framework (vue/react/angular)
  → detect-state-management
  → detect-large-bundles (if build output available)
  → detect-routing-structure

Step 2: Initial scan (async, ~5–10 s)
  → detect-accessibility-issues (sample components)
  → detect-responsive-patterns (sample)

Step 3: Per-file (on file open – components)
  → detect-prop-drilling
  → detect-memo-opportunities
  → detect-hooks-rules
  → detect-composables
  → detect-form-validation

Step 4: Per-file (on save)
  → detect-accessibility-issues (changed file)
  → detect-responsive-issues
  → detect-performance-antipatterns

Step 5: Suggestions (after detection)
  → suggest-* (only if findings + confidence > threshold)

Step 6: User action
  → apply-* (only on explicit user accept)
```

---

### 3. Trigger Conditions

| trigger | actions | condition |
|---------|---------|-----------|
| project-open | detect-state-management, detect-framework, detect-large-bundles | once per session |
| file-open | detect-prop-drilling, detect-memo-opportunities, detect-composables, detect-form-validation | `.vue` / `.tsx` / `.jsx` |
| file-save | detect-a11y-issues, detect-hooks-rules, detect-responsive-issues | changed file |
| user-request | apply-lazy-loading, migrate-to-pinia, extract-composables | manual |
| periodic | detect-large-bundles, detect-unnecessary-rerenders | every 5 min (idle) |
| pre-commit | detect-accessibility-issues, detect-performance-antipatterns | optional |

---

### 4. Frequency & Priority

```javascript
const actionFrequency = {
  high: [  // every save
    'detect-accessibility-issues',
    'detect-hooks-rules',
    'detect-responsive-issues',
  ],
  medium: [  // on file open
    'detect-prop-drilling',
    'detect-memo-opportunities',
    'detect-composables',
    'detect-form-validation',
    'detect-css-in-js',
  ],
  low: [  // once per session
    'detect-state-management',
    'detect-large-bundles',
    'detect-routing-patterns',
  ],
  onDemand: [
    'apply-lazy-loading',
    'migrate-to-pinia',
    'extract-composables',
    'refactor-to-context',
  ],
};
```

Rationale: high = quick checks, low friction; low = expensive; on-demand = user-controlled.

---

### 5. Dependency Chains

```
detect-framework
  ↓
detect-state-management (vuex/pinia/redux/ngrx)
  ↓ (if none)
suggest-pinia (vue) | suggest-redux (react)
  ↓ (if accepted)
migrate-to-pinia | setup-redux

detect-prop-drilling
  ↓ (if depth ≥ 3)
suggest-context (react) | suggest-provide-inject (vue)
  ↓ (if accepted)
refactor-to-context | refactor-provide-inject

detect-large-bundles
  ↓ (if bundle > threshold)
suggest-code-splitting
  ↓ (if accepted)
apply-lazy-loading

detect-memo-opportunities
  ↓ (if expensive child render)
suggest-usememo | suggest-react.memo
  ↓ (if accepted)
apply-memo

detect-composables
  ↓ (if reusable logic)
suggest-extract-hook | suggest-extract-composable
  ↓ (if accepted)
extract-composable

detect-accessibility-issues
  ↓ (if missing aria/alt)
suggest-aria-labels | suggest-semantic-html
  ↓ (if accepted)
apply-aria-fixes
```

---

### 6. Skip Conditions

```javascript
const skipConditions = {
  'suggest-pinia': {
    skip: ['has-pinia', 'has-vuex', 'project-too-small', 'user-dismissed-5+'],
  },
  'detect-memo-opportunities': {
    skip: ['not-react', 'component-small', 'already-memoized'],
  },
  'apply-lazy-loading': {
    skip: ['bundle-ok', 'already-lazy', 'critical-component', 'build-fails'],
  },
  'suggest-context': {
    skip: ['already-context', 'props-depth<3', 'not-component'],
  },
  'detect-accessibility-issues': {
    skip: ['non-ui-file', 'test-file'],
  },
  'detect-composables': {
    skip: ['logic-simple', 'single-use', 'already-composable'],
  },
  'suggest-extract-hook': {
    skip: ['logic-trivial', 'user-dismissed-3+'],
  },
};
```

---

### 7. Batch Execution

```javascript
const batches = {
  initialScan: [
    'detect-framework',
    'detect-state-management',
    'detect-large-bundles',
  ],
  componentAnalysis: [
    'detect-prop-drilling',
    'detect-memo-opportunities',
    'detect-hooks-rules',
    'detect-composables',
  ],
  accessibilityAudit: [
    'detect-accessibility-issues',
    'detect-semantic-html',
  ],
  performanceAudit: [
    'detect-large-bundles',
    'detect-unnecessary-rerenders',
    'detect-virtual-scroll-candidates',
  ],
};
```

---

### 8. Cost & Performance

| action | cost | time | cacheability |
|--------|------|------|--------------|
| detect-state-management | low | ~10ms | high |
| detect-framework | low | ~5ms | high |
| detect-prop-drilling | medium | 50–150ms | medium |
| detect-memo-opportunities | medium | 80–200ms | medium |
| detect-large-bundles | high | 1–3s | high |
| detect-accessibility-issues | medium | 100–300ms | low |
| detect-composables | medium | 100–200ms | medium |
| apply-lazy-loading | high | 2–10s | no |
| migrate-to-pinia | high | 5–30s | no |
| extract-composable | medium | 1–5s | no |

---

### 9. Success Metrics

```javascript
const successMetrics = {
  'suggest-pinia': { success: 'accepted', partial: 'dismissed', failure: 'error' },
  'apply-lazy-loading': { success: 'bundle-reduced', partial: 'applied-no-change', failure: 'build-failed' },
  'detect-accessibility-issues': { success: 'issues-found', partial: 'none-found', failure: 'scan-error' },
  'extract-composable': { success: 'extracted-used', partial: 'extracted-unused', failure: 'lint-error' },
};
```

---

### 10. Learning & Adaptation

```javascript
// Dismiss tracking
if (dismissCount['suggest-pinia'] >= 5) {
  disableAction('suggest-pinia', { scope: 'project' });
}

// Success rate
if (successRate['apply-lazy-loading'] > 0.9) {
  increaseConfidence('apply-lazy-loading', 0.1);
}

// No findings
if (findingsCount['detect-prop-drilling'] === 0 && fileCount > 20) {
  reduceFrequency('detect-prop-drilling', 'low');
}
```

---

### Examples

**Example 1: New Vue 3 Project**

1. **On open:** `detect-framework` → Vue 3, `detect-state-management` → none.
2. **Order:** framework → state detection.
3. **Suggestions:** suggest Pinia (if project size > threshold).
4. **On accept:** `migrate-to-pinia` (stores, main, usage).
5. **Follow-up:** suggest composables after state is in place.

**Example 2: Large React App**

1. **Performance actions:** `detect-large-bundles`, `detect-unnecessary-rerenders`, `detect-memo-opportunities`.
2. **Priority:** bundle size → rerenders → memo.
3. **Order:** suggest code-splitting, then lazy loading, then memo.
4. **Batch:** run component analysis in batches (e.g. 10 files at a time).

**Example 3: Accessibility Audit**

1. **Actions:** `detect-accessibility-issues`, `detect-semantic-html`.
2. **Scan:** all `.vue` / `.tsx` / `.jsx` components.
3. **Grouping:** by severity (missing aria, missing alt, semantic).
4. **Auto-fixes:** add `aria-label`, `alt`, basic semantic tags.

---

This describes a design for your A2A system; I don't run this workflow myself.

---

## Ключевые выводы

### Важное уточнение:
- ⚠️ **Cursor НЕ имеет** automated frontend-actions workflow
- ⚠️ Отвечает на user requests, использует tools по требованию
- ✅ Дал **полную спецификацию для A2A системы**

### 11 групп actions:
1. state-detection (once/session)
2. component-analysis (per-file)
3. performance-check (per-save)
4. performance-audit (low frequency)
5. accessibility (per-save)
6. responsive (per-file)
7. hooks-composables (per-file)
8. forms (per-file)
9. routing (low frequency)
10. styling (per-file)
11. animation (per-file)

### 6-step execution sequence:
1. Project detection (on open)
2. Initial scan (5-10s async)
3. Per-file on open
4. Per-file on save
5. Suggestions (if confidence > threshold)
6. User action (explicit accept)

### 6 trigger conditions:
- project-open (once/session)
- file-open (per `.vue`/`.tsx`/`.jsx`)
- file-save (changed file)
- user-request (manual)
- periodic (every 5 min idle)
- pre-commit (optional)

### Frequency classification:
- **High** (every save): a11y, hooks-rules, responsive
- **Medium** (on file open): prop-drilling, memo, composables, forms, css-in-js
- **Low** (once/session): state-management, large-bundles, routing
- **On-demand** (user): apply-*, migrate-*, extract-*

### 6 dependency chains:
1. framework → state → suggest → migrate
2. prop-drilling → suggest-context → refactor
3. large-bundles → code-splitting → lazy-loading
4. memo-opportunities → suggest-memo → apply
5. composables → extract-hook → extract
6. a11y-issues → suggest-aria → apply-fixes

### Cost & Performance:
- **Low** (5-10ms): framework, state-management
- **Medium** (50-300ms): prop-drilling, memo, a11y, composables
- **High** (1-30s): large-bundles, apply-*, migrate-*

---

## Применение в A2A

### Реализация в terminator/

```javascript
// terminator/modules/frontend-actions/
class FrontendActionsOrchestrator {
  constructor() {
    this.groups = {
      'state-detection': { trigger: 'project-open', frequency: 'once' },
      'component-analysis': { trigger: 'file-open', frequency: 'per-file' },
      'performance-check': { trigger: 'file-save', frequency: 'per-save' },
      // ... остальные группы
    };
    
    this.skipConditions = {
      'suggest-pinia': ['has-pinia', 'has-vuex', 'project-too-small'],
      // ... остальные условия
    };
    
    this.dismissCount = {};
    this.successRate = {};
  }
  
  async onProjectOpen(project) {
    // Step 1: Project detection
    const framework = await this.detectFramework(project);
    const stateManagement = await this.detectStateManagement(project);
    const bundles = await this.detectLargeBundles(project);
    
    // Step 2: Initial scan (async)
    setTimeout(() => {
      this.initialScan(project);
    }, 1000);
    
    return { framework, stateManagement, bundles };
  }
  
  async onFileOpen(file) {
    if (!this.isComponentFile(file)) return;
    
    // Step 3: Per-file analysis
    const results = await Promise.all([
      this.detectPropDrilling(file),
      this.detectMemoOpportunities(file),
      this.detectHooksRules(file),
      this.detectComposables(file),
      this.detectFormValidation(file)
    ]);
    
    // Step 5: Suggestions
    return this.generateSuggestions(results);
  }
  
  async onFileSave(file) {
    // Step 4: Per-save checks
    const results = await Promise.all([
      this.detectAccessibilityIssues(file),
      this.detectResponsiveIssues(file),
      this.detectPerformanceAntipatterns(file)
    ]);
    
    return results;
  }
  
  shouldSkip(action, context) {
    const conditions = this.skipConditions[action] || [];
    return conditions.some(cond => this.checkCondition(cond, context));
  }
  
  async applyAction(action, context) {
    // Step 6: User action
    if (this.shouldSkip(action, context)) {
      return { skipped: true };
    }
    
    const result = await this.executeAction(action, context);
    
    // Learning
    this.updateMetrics(action, result);
    
    return result;
  }
  
  updateMetrics(action, result) {
    if (result.dismissed) {
      this.dismissCount[action] = (this.dismissCount[action] || 0) + 1;
      
      if (this.dismissCount[action] >= 5) {
        this.disableAction(action);
      }
    }
    
    if (result.success) {
      const rate = this.successRate[action] || 0;
      this.successRate[action] = (rate * 0.9) + (1 * 0.1); // EMA
      
      if (this.successRate[action] > 0.9) {
        this.increaseConfidence(action);
      }
    }
  }
}
```

---

## Интеграция с существующей системой

### terminator/plans/FRONTEND-ACTIONS.md

Использовать эту спецификацию как основу для:
- Action definitions
- Trigger conditions
- Dependency chains
- Skip conditions
- Success metrics

### terminator/orchestrator.js

Добавить:
- Event handlers (project-open, file-open, file-save)
- Batch execution
- Learning & adaptation

---

## Следующие шаги

1. ✅ Получить спецификацию от Cursor
2. ⏳ Реализовать FrontendActionsOrchestrator
3. ⏳ Добавить 11 групп actions
4. ⏳ Реализовать 6 dependency chains
5. ⏳ Добавить skip conditions
6. ⏳ Реализовать learning & adaptation
7. ⏳ Интегрировать с terminator/orchestrator.js
8. ⏳ Тестировать на Vue/React проектах
