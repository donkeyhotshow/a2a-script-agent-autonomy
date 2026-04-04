# Cursor Answer: Backend Actions Workflow

**Date**: 2024
**Question**: `.amazonq/questions-to-cursor/actions/BACKEND-WORKFLOW.md`
**Status**: ✅ Collected (8/11)

---

## Cursor's Response

### Clarification

Cursor does NOT run an automated backend-actions workflow. It responds to user requests and uses tools (codebase search, grep, read, edit) only when needed. There is no predefined set of backend actions or orchestration.

Below is a design specification for A2A implementation.

---

## 1. Execution Sequences

### Scenario A: New API Endpoint

```
Step 1: detect-api-endpoint (new route/controller method)
Step 2: detect-missing-validation
Step 3: detect-missing-auth
Step 4: detect-missing-error-handling
Step 5: suggest-validation-rules | suggest-middleware | suggest-try-catch
Step 6: detect-n+1-queries (if DB)
Step 7: suggest-eager-loading (if N+1)
Step 8: suggest-api-tests
```

### Scenario B: Database Optimization

```
Step 1: detect-n+1-queries
Step 2: detect-missing-indexes
Step 3: detect-slow-queries (if query logs)
Step 4: suggest-eager-loading
Step 5: suggest-indexes
Step 6: suggest-query-optimization
Step 7: suggest-caching (if read-heavy)
```

### Scenario C: Security Audit

```
Step 1: detect-missing-auth
Step 2: detect-sql-injection
Step 3: detect-xss-vulnerabilities
Step 4: detect-csrf-issues
Step 5: detect-missing-validation (mass assign)
Step 6: suggest-fixes (prioritized by severity)
```

### Scenario D: New Controller/Model

```
Step 1: detect-controller
Step 2: detect-missing-validation
Step 3: detect-missing-auth
Step 4: detect-error-handling
Step 5: suggest-tests
```

---

## 2. Trigger Matrix

| action | on-save | on-request | on-deploy | background | manual |
|--------|---------|------------|-----------|------------|--------|
| detect-missing-validation | ✅ | | | | |
| detect-n+1-queries | | ✅ | | ✅ | |
| detect-missing-auth | ✅ | | | | |
| detect-sql-injection | ✅ | | | | |
| detect-missing-indexes | | | | ✅ | ✅ |
| detect-slow-queries | | | | ✅ | ✅ |
| suggest-caching | | | | ✅ | ✅ |
| suggest-eager-loading | | | | | ✅ |
| apply-eager-loading | | | | | ✅ |
| suggest-background-jobs | | | | | ✅ |
| detect-missing-tests | ✅ | | | | |
| suggest-rate-limiting | | | | | ✅ |
| suggest-logging | | | | | ✅ |

---

## 3. Priority & Severity

```javascript
const actionPriority = {
  critical: [
    'detect-missing-auth',
    'detect-sql-injection',
    'detect-xss-vulnerabilities',
    'detect-mass-assignment',
  ],
  high: [
    'detect-missing-validation',
    'detect-n+1-queries',
    'detect-missing-error-handling',
    'detect-missing-indexes',
  ],
  medium: [
    'suggest-caching',
    'suggest-background-jobs',
    'suggest-rate-limiting',
    'detect-missing-tests',
  ],
  low: [
    'suggest-logging',
    'suggest-api-versioning',
    'detect-code-duplication',
  ],
};
```

---

## 4. Dependency Graph

```
detect-api-endpoint / detect-controller
  ↓
detect-missing-validation
  ↓ (if missing) → suggest-validation-rules → apply-validation
  ↓
detect-missing-auth
  ↓ (if missing) → suggest-middleware → apply-auth-middleware
  ↓
detect-missing-error-handling
  ↓ (if missing) → suggest-try-catch → apply-error-handling
  ↓
detect-n+1-queries
  ↓ (if detected) → suggest-eager-loading → apply-eager-loading
  ↓
detect-missing-indexes
  ↓ (if missing) → suggest-indexes → apply-migration
  ↓
suggest-api-tests → apply-tests

detect-sql-injection → suggest-prepared-statements → apply-fix
detect-xss → suggest-sanitization → apply-fix
detect-missing-cache → suggest-caching → apply-caching
```

---

## 5. Batch Processing

```javascript
const batches = {
  securityAudit: {
    actions: ['detect-missing-auth', 'detect-sql-injection', 'detect-xss', 'detect-mass-assignment'],
    parallel: true,
    timeout: 30000,
  },
  performanceAudit: {
    actions: ['detect-n+1-queries', 'detect-missing-indexes', 'detect-slow-queries', 'detect-missing-cache'],
    parallel: true,
    timeout: 60000,
  },
  apiValidation: {
    actions: ['detect-missing-validation', 'detect-missing-error-handling', 'detect-missing-auth'],
    parallel: false,
    timeout: 15000,
  },
  qualityAudit: {
    actions: ['detect-missing-tests', 'detect-code-duplication'],
    parallel: true,
    timeout: 20000,
  },
};
```

---

## 6. Context Requirements

| action | requires | optional | cost |
|--------|----------|----------|------|
| detect-n+1-queries | routes, models, controllers, relationships | query logs | high |
| detect-missing-auth | routes, middleware | user model | low |
| detect-missing-validation | controller, request | rules | low |
| suggest-eager-loading | models, relationships | query logs | high |
| suggest-caching | controllers, queries | cache config | medium |
| detect-sql-injection | controllers, raw queries | | low |
| suggest-indexes | migrations, queries | slow query log | medium |
| suggest-background-jobs | controllers, heavy logic | queue config | medium |

---

## 7. Validation & Rollback Algorithm

```
PRE-APPLY:
  - syntaxCheck (parse/module load)
  - createBackup (git stash / copy)
  - optional: runTests (baseline)

APPLY:
  - result = applyAction(action, context)

POST-APPLY:
  - syntaxCheck(result.code)
  - if fail → rollback(backup) → logFailure → stop
  - runTests (if available)
  - if fail → rollback(backup) → suggestAlternative
  - if pass → commitBackup as optional checkpoint

ROLLBACK:
  - restore from backup
  - clear caches if needed
  - log(action, error, backupId)
```

---

## 8. Performance Impact

| action | time | cpu | memory | io | cacheability |
|--------|------|-----|--------|----|--------------|
| detect-n+1-queries | 2s | high | 100MB | high | medium |
| detect-missing-auth | 100ms | low | 10MB | low | high |
| detect-missing-validation | 50ms | low | 5MB | low | high |
| apply-eager-loading | 5s | medium | 50MB | high | no |
| suggest-caching | 500ms | low | 20MB | medium | high |
| detect-sql-injection | 200ms | low | 15MB | low | high |
| suggest-indexes | 1s | medium | 30MB | medium | high |

---

## 9. Success Criteria

```javascript
const successCriteria = {
  'apply-eager-loading': {
    metrics: ['queryCountReduced', 'noNewErrors'],
    thresholds: { queryReduction: 0.3 },
  },
  'apply-validation': {
    metrics: ['validationAdded', 'testsPass'],
    thresholds: { coverage: 1.0 },
  },
  'apply-auth-middleware': {
    metrics: ['middlewareApplied', 'testsPass'],
  },
  'apply-caching': {
    metrics: ['cacheAdded', 'responseTimeFaster'],
    thresholds: { speedImprovement: 0.2 },
  },
};
```

---

## 10. Learning Algorithm

```javascript
// Success rate
if (successRate(action) > 0.8) increaseConfidence(action);
if (successRate(action) < 0.5) addSkipCondition(action, failureContext);

// Failure patterns
const patterns = analyzeFailures(action);
patterns.forEach((p) => addSkipCondition(action, p));

// Project-specific
if (dismissCount(action) >= 5) disableAction(action, { scope: 'project' });
```

---

## 11. Examples

### Example 1: New Laravel API Endpoint

```
1. User adds POST /api/users in routes + controller
2. On save: detect-missing-validation, detect-missing-auth, detect-missing-error-handling
3. Findings: no validation, no auth, no try-catch
4. Suggestions: FormRequest validation, auth:sanctum, try-catch with 422
5. Nothing auto-applied; user accepts or edits manually
6. If accepted: apply-validation, apply-auth, apply-error-handling
7. Follow-up: suggest-api-tests
```

### Example 2: Performance Issue (slow API)

```
1. User reports: "API slow, 2s"
2. Performance batch: detect-n+1-queries, detect-missing-indexes, detect-missing-cache
3. N+1: posts → comments → users in loop; detected from models + controller
4. Suggest: Post::with(['comments.user'])->get()
5. Apply eager loading
6. Validate: fewer queries, faster response (optional benchmark)
```

### Example 3: Security Audit

```
1. Manual security audit
2. Batch: detect-missing-auth, detect-sql-injection, detect-xss, detect-mass-assignment
3. Scan: routes, middleware, controllers, views/response
4. Order: auth → sql → xss → mass-assignment
5. Auto-fixes: parameterized queries, output escaping; auth/validation require review
```

---

## Key Insights

### INSIGHT 1: No Automated Backend Workflow
Cursor does NOT have predefined backend action sequences. It responds to user requests with tools on-demand. No orchestration layer exists.

### INSIGHT 2: Trigger-Based Execution
Backend actions should be triggered by:
- **on-save**: Security checks (auth, validation, SQL injection)
- **on-request**: User-initiated analysis
- **background**: Performance audits (N+1, indexes, slow queries)
- **manual**: Complex operations (eager loading, caching, background jobs)

### INSIGHT 3: Priority Classification
Actions prioritized by impact:
- **Critical**: Security vulnerabilities (auth, SQL injection, XSS, mass assignment)
- **High**: Performance issues (N+1, indexes) and reliability (error handling)
- **Medium**: Optimizations (caching, background jobs, tests)
- **Low**: Maintenance (logging, versioning, duplication)

### INSIGHT 4: Dependency Chains
Backend actions form dependency chains:
- Detection → Suggestion → Application → Validation
- Example: detect-n+1 → suggest-eager-loading → apply-eager-loading → validate-performance

### INSIGHT 5: Batch Processing Strategy
Group related actions for efficiency:
- **Security audit**: Parallel execution of all security checks (30s timeout)
- **Performance audit**: Parallel N+1, indexes, slow queries (60s timeout)
- **API validation**: Sequential validation, error handling, auth (15s timeout)

### INSIGHT 6: Context Cost Awareness
Actions have different context requirements:
- **High cost**: N+1 detection (routes, models, controllers, relationships)
- **Low cost**: Auth detection (routes, middleware only)
- **Medium cost**: Caching suggestions (controllers, queries, config)

### INSIGHT 7: Validation & Rollback Required
Every action application needs:
- Pre-apply: Syntax check, backup creation, optional baseline tests
- Post-apply: Syntax validation, test execution, rollback on failure
- Rollback: Restore backup, clear caches, log failure

### INSIGHT 8: Performance Monitoring
Track action performance:
- Fast checks (<100ms): auth, validation detection
- Medium checks (500ms-2s): N+1 detection, caching suggestions
- Slow operations (5s+): Eager loading application

### INSIGHT 9: Success Metrics
Define measurable success criteria:
- **Eager loading**: 30%+ query reduction, no new errors
- **Validation**: 100% field coverage, tests pass
- **Caching**: 20%+ speed improvement

### INSIGHT 10: Learning from Results
Adapt behavior based on outcomes:
- Success rate >80%: Increase confidence, suggest more aggressively
- Success rate <50%: Add skip conditions for failure patterns
- Dismiss count ≥5: Disable action for project scope

---

## A2A Implementation

### BackendActionOrchestrator Class

```javascript
class BackendActionOrchestrator {
  constructor() {
    this.actions = new Map();
    this.batches = this.initBatches();
    this.stats = new Map();
    this.skipConditions = new Map();
  }

  initBatches() {
    return {
      securityAudit: {
        actions: ['detect-missing-auth', 'detect-sql-injection', 'detect-xss', 'detect-mass-assignment'],
        parallel: true,
        timeout: 30000,
      },
      performanceAudit: {
        actions: ['detect-n+1-queries', 'detect-missing-indexes', 'detect-slow-queries', 'detect-missing-cache'],
        parallel: true,
        timeout: 60000,
      },
      apiValidation: {
        actions: ['detect-missing-validation', 'detect-missing-error-handling', 'detect-missing-auth'],
        parallel: false,
        timeout: 15000,
      },
    };
  }

  async executeSequence(scenario, context) {
    const sequence = this.getSequence(scenario);
    const results = [];

    for (const step of sequence) {
      const result = await this.executeAction(step, context);
      results.push(result);

      // Check dependencies
      if (result.shouldSkipNext) break;
      if (result.nextAction) {
        results.push(await this.executeAction(result.nextAction, context));
      }
    }

    return results;
  }

  async executeBatch(batchName, context) {
    const batch = this.batches[batchName];
    if (!batch) throw new Error(`Unknown batch: ${batchName}`);

    const promises = batch.actions.map(action => 
      this.executeAction(action, context)
    );

    if (batch.parallel) {
      return Promise.race([
        Promise.all(promises),
        this.timeout(batch.timeout)
      ]);
    } else {
      const results = [];
      for (const action of batch.actions) {
        results.push(await this.executeAction(action, context));
      }
      return results;
    }
  }

  async executeAction(actionName, context) {
    // Check skip conditions
    if (this.shouldSkip(actionName, context)) {
      return { skipped: true, reason: 'skip-condition' };
    }

    const startTime = Date.now();
    const backup = await this.createBackup(context);

    try {
      const result = await this.runAction(actionName, context);
      
      // Validate result
      const valid = await this.validate(result, context);
      if (!valid) {
        await this.rollback(backup);
        return { success: false, error: 'validation-failed' };
      }

      // Update stats
      this.updateStats(actionName, true, Date.now() - startTime);
      
      return { success: true, result };
    } catch (error) {
      await this.rollback(backup);
      this.updateStats(actionName, false, Date.now() - startTime);
      return { success: false, error: error.message };
    }
  }

  shouldSkip(actionName, context) {
    const conditions = this.skipConditions.get(actionName) || [];
    return conditions.some(cond => cond(context));
  }

  updateStats(actionName, success, duration) {
    const stats = this.stats.get(actionName) || { attempts: 0, successes: 0, failures: 0, totalTime: 0 };
    stats.attempts++;
    if (success) stats.successes++;
    else stats.failures++;
    stats.totalTime += duration;
    this.stats.set(actionName, stats);

    // Learning
    this.learn(actionName, stats);
  }

  learn(actionName, stats) {
    const successRate = stats.successes / stats.attempts;

    if (successRate > 0.8) {
      // High success - increase confidence
      this.increaseConfidence(actionName);
    } else if (successRate < 0.5) {
      // Low success - add skip conditions
      const patterns = this.analyzeFailures(actionName);
      patterns.forEach(p => this.addSkipCondition(actionName, p));
    }
  }

  getSequence(scenario) {
    const sequences = {
      'new-api-endpoint': [
        'detect-api-endpoint',
        'detect-missing-validation',
        'detect-missing-auth',
        'detect-missing-error-handling',
        'detect-n+1-queries',
        'suggest-api-tests',
      ],
      'database-optimization': [
        'detect-n+1-queries',
        'detect-missing-indexes',
        'detect-slow-queries',
        'suggest-eager-loading',
        'suggest-indexes',
        'suggest-caching',
      ],
      'security-audit': [
        'detect-missing-auth',
        'detect-sql-injection',
        'detect-xss-vulnerabilities',
        'detect-csrf-issues',
        'detect-missing-validation',
      ],
    };

    return sequences[scenario] || [];
  }
}
```

### Action Detector Example

```javascript
class N1QueryDetector {
  async detect(context) {
    const { routes, models, controllers } = context;
    const issues = [];

    for (const controller of controllers) {
      const loops = this.findLoops(controller.code);
      
      for (const loop of loops) {
        const queries = this.findQueriesInLoop(loop);
        
        if (queries.length > 0) {
          const relationships = this.analyzeRelationships(queries, models);
          
          if (relationships.length > 0) {
            issues.push({
              file: controller.path,
              line: loop.line,
              type: 'n+1-query',
              severity: 'high',
              queries: queries,
              suggestion: this.generateEagerLoadingSuggestion(relationships),
            });
          }
        }
      }
    }

    return issues;
  }

  generateEagerLoadingSuggestion(relationships) {
    const relations = relationships.map(r => r.name).join('.');
    return `Use eager loading: Model::with(['${relations}'])->get()`;
  }
}
```

---

## Best Practices

1. **Always create backups** before applying actions
2. **Validate results** with syntax checks and tests
3. **Track statistics** for learning and adaptation
4. **Use batch processing** for related actions
5. **Prioritize by severity** (critical security first)
6. **Respect context costs** (cache high-cost operations)
7. **Implement rollback** for all apply actions
8. **Learn from failures** (add skip conditions)
9. **Measure success** with concrete metrics
10. **Disable low-performing actions** per project

---

## Summary

Cursor does NOT implement automated backend workflows. The specification above provides a complete design for A2A systems including:
- 4 execution sequences for common scenarios
- Trigger matrix for 13 backend actions
- Priority classification (critical/high/medium/low)
- Complete dependency graph
- 4 batch processing strategies
- Context requirements table
- Validation & rollback algorithm
- Performance impact metrics
- Success criteria definitions
- Learning algorithm with adaptation
- 3 detailed implementation examples

**Key takeaway**: Backend actions require careful orchestration with validation, rollback, learning, and context-aware execution.
