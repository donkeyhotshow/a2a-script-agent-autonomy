# Cursor Answer: Testing & Verification Strategies

**Date**: 2024
**Question**: `.amazonq/questions-to-cursor/TESTING-VERIFICATION.md`
**Status**: ✅ Collected (9/11)

---

## Cursor's Response

### Clarification

Cursor does NOT run tests, builds, or any code. It relies on:
- **read_lints**: IDE/linter output
- **User feedback**: Errors, broken behavior

Cursor never directly runs: unit tests, integration tests, builds, or type checks. The IDE does that.

Below is a design specification for A2A implementation.

---

## 1. Verification Levels

| level | method | cost | coverage | automation |
|-------|--------|------|----------|------------|
| syntax | parser | low | 100% | ✅ |
| types | type-checker | low | 95% | ✅ |
| lint | ESLint/etc | low | 85% | ✅ |
| unit | run-tests | medium | 70% | ⏳ |
| integration | run-tests | high | 50% | ⏳ |
| e2e | playwright/cypress | high | 30% | ❌ |
| manual | user | high | varies | ❌ |

---

## 2. Static Analysis

| check | always | optional |
|-------|--------|----------|
| syntaxValid | ✅ | |
| typesCorrect | ✅ | (TS projects) |
| importsResolved | ✅ | |
| noUnusedVars | ✅ | (via lint) |
| noCircularDeps | ❌ | ⏳ |
| noDeadCode | ❌ | ⏳ |
| formattingCorrect | ❌ | ⏳ (Prettier) |
| noVulnerabilities | ❌ | ⏳ |

---

## 3. Dynamic Analysis

| check | when |
|-------|------|
| buildSucceeds | user runs build / CI |
| unitTestsPass | user runs tests / CI |
| integrationTestsPass | rarely, CI |
| e2ePass | rarely, CI |
| noRuntimeErrors | indirect via user feedback |
| noPerformanceRegression | almost never |

**Determination**: If user/CI runs build/tests, use results; otherwise only static checks.

---

## 4. Diff Analysis (Risk Assessment)

```javascript
const riskFactors = {
  linesChanged: (n) => (n > 50 ? 20 : n > 20 ? 10 : 0),
  filesChanged: (n) => (n > 5 ? 15 : n > 2 ? 5 : 0),
  apiChanged: (b) => (b ? 25 : 0),
  testFilesChanged: (b) => (b ? -5 : 0), // positive = lower risk
  breakingSignature: (b) => (b ? 30 : 0),
};

const riskScore = Object.values(riskFactors).reduce((s, f) => s + f(arg), 0);
```

---

## 5. Regression Detection

```javascript
// Compare before/after
const regression = {
  syntaxErrors: after.syntaxErrors > before.syntaxErrors,
  typeErrors: after.typeErrors > before.typeErrors,
  lintErrors: after.lintErrors > before.lintErrors,
  testsFailing: after.testsFailing > before.testsFailing,
  buildFails: after.buildFails && !before.buildFails,
};

// Regress if any true
```

---

## 6. Test Generation

Cursor can suggest tests when asked. It doesn't generate them automatically or wire them into CI.

**For A2A:**
- **When**: After adding/changing logic, or when asked
- **How**: Branch coverage (happy path + edge cases) from function signature and behavior
- **Test cases**: Empty/valid/invalid inputs, boundaries, error paths

---

## 7. Confidence Scoring

```javascript
function confidenceScore(change) {
  let s = 100;
  
  // Critical issues
  s -= (change.syntaxErrors || 0) * 40;
  s -= (change.typeErrors || 0) * 15;
  s -= (change.lintErrors || 0) * 5;
  
  // Test results
  if (change.testsRun) {
    s += (change.testsPassed || 0) * 0.5;
    s -= (change.testsFailed || 0) * 10;
  }
  
  // Change size
  if ((change.linesChanged || 0) > 100) s -= 15;
  if ((change.filesChanged || 0) > 5) s -= 10;
  
  // Build status
  if (change.buildFailed) s -= 50;
  
  return Math.max(0, Math.min(100, s));
}
```

---

## 8. Rollback Criteria

| criterion | rollback |
|-----------|----------|
| syntaxErrors | ✅ |
| buildFails | ✅ |
| typeErrorsIncreased | ✅ |
| lintErrorsIncreased | ⏳ (if critical) |
| testsFailingIncreased | ⏳ (if caused by my changes) |
| styleViolations | ❌ |

---

## 9. Incremental Verification

Use for multi-step refactors:

```
1. Change A → verify (syntax/types/lint)
2. Change B → verify
3. etc.
```

Stop on failure and fix before continuing.

---

## 10. Verification Caching (A2A)

| cache | invalidate on |
|-------|---------------|
| syntax | file change |
| types | file change |
| lint | file change |
| tests | file change in scope |

Use file hash + timestamp.

---

## 11. Step-by-Step Examples

### Example 1: Simple Refactoring

```
1. Before: read file, infer types/usage
2. After: syntax, types, lint via read_lints
3. Safe if: no new errors, same public behavior
4. Tests: user decision; ideally run if available
```

### Example 2: Add Validation

```
1. Checks: syntax, types, lint
2. Template: Vue compiler/linter validates
3. Reactivity: ref usage and dependency correctness
4. Manual: recommended for UX
```

### Example 3: Extract Composable

```
1. Composable: syntax, types, exports
2. Component: imports, usage, types
3. Safety: no new errors, same behavior
4. New tests: recommend if logic is non-trivial
```

### Example 4: Multi-file Refactoring

```
1. Each file: syntax after each edit
2. Together: types, lint, build when done
3. Order: create → update refs → rename
4. On error: revert last step, fix, retry
```

---

## 12. Best Practices for A2A

1. **Run syntax and types** after every edit
2. **Run tests** when changing behavior or logic
3. **Keep edits small** and verify often
4. **Rollback** on syntax/build/type regressions
5. **Use confidence score** for automated vs manual review
6. **Cache verification** by file hash
7. **Prefer incremental verification** for large refactors
8. **Require manual review** for high-risk changes (API, multi-file)

---

## Key Insights

### INSIGHT 1: No Code Execution
Cursor does NOT run tests, builds, or any code. It only reads linter output (read_lints) and receives user feedback about errors. All dynamic analysis happens in the IDE/CI, not in Cursor.

### INSIGHT 2: Static Analysis Only
Cursor relies entirely on static analysis:
- **Always**: Syntax validation, type checking (TS), import resolution, unused vars (via lint)
- **Optional**: Circular deps, dead code, formatting, vulnerabilities
- **Never**: Runtime behavior, performance, actual test execution

### INSIGHT 3: Verification Hierarchy
7 verification levels with decreasing automation:
1. **Syntax** (100% coverage, low cost, fully automated)
2. **Types** (95% coverage, low cost, fully automated)
3. **Lint** (85% coverage, low cost, fully automated)
4. **Unit tests** (70% coverage, medium cost, partial automation)
5. **Integration** (50% coverage, high cost, partial automation)
6. **E2E** (30% coverage, high cost, not automated)
7. **Manual** (varies, high cost, not automated)

### INSIGHT 4: Risk-Based Scoring
Risk assessment formula with 5 factors:
- Lines changed: >50 = 20 points, >20 = 10 points
- Files changed: >5 = 15 points, >2 = 5 points
- API changed: 25 points
- Test files changed: -5 points (reduces risk)
- Breaking signature: 30 points

### INSIGHT 5: Regression Detection
Compare before/after metrics:
- Syntax errors increased → regression
- Type errors increased → regression
- Lint errors increased → regression
- Tests failing increased → regression
- Build fails (when didn't before) → regression

### INSIGHT 6: Confidence Formula
Confidence score (0-100) with weighted penalties:
- Syntax errors: -40 per error (critical)
- Type errors: -15 per error (high)
- Lint errors: -5 per error (medium)
- Test failures: -10 per failure
- Large changes: -15 for >100 lines, -10 for >5 files
- Build failure: -50 (critical)
- Test passes: +0.5 per pass (small bonus)

### INSIGHT 7: Rollback Triggers
Automatic rollback on:
- ✅ Syntax errors (always)
- ✅ Build fails (always)
- ✅ Type errors increased (always)
- ⏳ Lint errors increased (if critical)
- ⏳ Tests failing increased (if caused by changes)
- ❌ Style violations (never)

### INSIGHT 8: Incremental Verification
For multi-step refactors:
- Verify after each small change (syntax → types → lint)
- Stop on failure and fix before continuing
- Prevents cascading errors
- Easier to identify root cause

### INSIGHT 9: Verification Caching
Cache results by file hash + timestamp:
- **Syntax cache**: Invalidate on file change
- **Types cache**: Invalidate on file change
- **Lint cache**: Invalidate on file change
- **Tests cache**: Invalidate on file change in scope

### INSIGHT 10: Test Generation Strategy
Cursor suggests tests when asked, doesn't auto-generate:
- **When**: After logic changes or on request
- **Coverage**: Branch coverage (happy path + edge cases)
- **Cases**: Empty/valid/invalid inputs, boundaries, error paths
- **Not automated**: User must wire into CI

---

## A2A Implementation

### VerificationOrchestrator Class

```javascript
class VerificationOrchestrator {
  constructor() {
    this.cache = new Map();
    this.levels = ['syntax', 'types', 'lint', 'unit', 'integration'];
  }

  async verify(change, options = {}) {
    const results = {
      level: options.level || 'lint',
      passed: true,
      errors: [],
      warnings: [],
      confidence: 100,
      riskScore: 0,
    };

    // Calculate risk
    results.riskScore = this.calculateRisk(change);

    // Run verification levels
    for (const level of this.levels) {
      if (this.shouldSkip(level, options.level)) break;

      const cached = this.getCache(change, level);
      if (cached) {
        results[level] = cached;
        continue;
      }

      const result = await this.runLevel(level, change);
      results[level] = result;
      this.setCache(change, level, result);

      if (!result.passed) {
        results.passed = false;
        results.errors.push(...result.errors);
      }
    }

    // Calculate confidence
    results.confidence = this.calculateConfidence(results);

    // Check rollback criteria
    results.shouldRollback = this.shouldRollback(results);

    return results;
  }

  calculateRisk(change) {
    const factors = {
      linesChanged: (n) => (n > 50 ? 20 : n > 20 ? 10 : 0),
      filesChanged: (n) => (n > 5 ? 15 : n > 2 ? 5 : 0),
      apiChanged: (b) => (b ? 25 : 0),
      testFilesChanged: (b) => (b ? -5 : 0),
      breakingSignature: (b) => (b ? 30 : 0),
    };

    let score = 0;
    score += factors.linesChanged(change.linesChanged || 0);
    score += factors.filesChanged(change.filesChanged || 0);
    score += factors.apiChanged(change.apiChanged || false);
    score += factors.testFilesChanged(change.testFilesChanged || false);
    score += factors.breakingSignature(change.breakingSignature || false);

    return score;
  }

  calculateConfidence(results) {
    let s = 100;

    // Critical issues
    s -= (results.syntax?.errors?.length || 0) * 40;
    s -= (results.types?.errors?.length || 0) * 15;
    s -= (results.lint?.errors?.length || 0) * 5;

    // Test results
    if (results.unit) {
      s += (results.unit.passed || 0) * 0.5;
      s -= (results.unit.failed || 0) * 10;
    }

    // Change size
    if (results.riskScore > 50) s -= 15;
    if (results.riskScore > 30) s -= 10;

    // Build status
    if (results.buildFailed) s -= 50;

    return Math.max(0, Math.min(100, s));
  }

  shouldRollback(results) {
    // Always rollback
    if (results.syntax?.errors?.length > 0) return true;
    if (results.buildFailed) return true;
    if (results.types?.errorsIncreased) return true;

    // Conditional rollback
    if (results.lint?.criticalErrors > 0) return true;
    if (results.unit?.failuresIncreased && results.unit?.causedByChanges) return true;

    return false;
  }

  async runLevel(level, change) {
    switch (level) {
      case 'syntax':
        return this.checkSyntax(change);
      case 'types':
        return this.checkTypes(change);
      case 'lint':
        return this.checkLint(change);
      case 'unit':
        return this.runTests(change, 'unit');
      case 'integration':
        return this.runTests(change, 'integration');
      default:
        return { passed: true, errors: [] };
    }
  }

  getCache(change, level) {
    const key = this.getCacheKey(change, level);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if still valid
    if (Date.now() - cached.timestamp > 60000) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  setCache(change, level, result) {
    const key = this.getCacheKey(change, level);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  getCacheKey(change, level) {
    const hash = this.hashChange(change);
    return `${hash}:${level}`;
  }

  hashChange(change) {
    // Simple hash based on file path and content
    return `${change.file}:${change.content?.length || 0}`;
  }
}
```

### RegressionDetector Class

```javascript
class RegressionDetector {
  detectRegression(before, after) {
    const regressions = [];

    // Syntax errors
    if (after.syntaxErrors > before.syntaxErrors) {
      regressions.push({
        type: 'syntax',
        severity: 'critical',
        before: before.syntaxErrors,
        after: after.syntaxErrors,
      });
    }

    // Type errors
    if (after.typeErrors > before.typeErrors) {
      regressions.push({
        type: 'types',
        severity: 'high',
        before: before.typeErrors,
        after: after.typeErrors,
      });
    }

    // Lint errors
    if (after.lintErrors > before.lintErrors) {
      regressions.push({
        type: 'lint',
        severity: 'medium',
        before: before.lintErrors,
        after: after.lintErrors,
      });
    }

    // Test failures
    if (after.testsFailing > before.testsFailing) {
      regressions.push({
        type: 'tests',
        severity: 'high',
        before: before.testsFailing,
        after: after.testsFailing,
      });
    }

    // Build status
    if (after.buildFails && !before.buildFails) {
      regressions.push({
        type: 'build',
        severity: 'critical',
        before: 'passing',
        after: 'failing',
      });
    }

    return {
      hasRegression: regressions.length > 0,
      regressions,
      severity: this.getMaxSeverity(regressions),
    };
  }

  getMaxSeverity(regressions) {
    const severities = ['critical', 'high', 'medium', 'low'];
    for (const severity of severities) {
      if (regressions.some(r => r.severity === severity)) {
        return severity;
      }
    }
    return 'none';
  }
}
```

### IncrementalVerifier Class

```javascript
class IncrementalVerifier {
  async verifySteps(steps, context) {
    const results = [];
    let currentState = context.initialState;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Apply step
      const newState = await this.applyStep(step, currentState);
      
      // Verify
      const verification = await this.verify(newState);
      
      results.push({
        step: i + 1,
        verification,
        state: newState,
      });

      // Stop on failure
      if (!verification.passed) {
        await this.rollback(currentState);
        return {
          success: false,
          failedAt: i + 1,
          results,
          error: verification.errors[0],
        };
      }

      currentState = newState;
    }

    return {
      success: true,
      results,
      finalState: currentState,
    };
  }

  async verify(state) {
    // Run syntax, types, lint
    const checks = await Promise.all([
      this.checkSyntax(state),
      this.checkTypes(state),
      this.checkLint(state),
    ]);

    return {
      passed: checks.every(c => c.passed),
      errors: checks.flatMap(c => c.errors),
    };
  }
}
```

---

## Best Practices Summary

1. **Run syntax and types after every edit** - Catch errors immediately
2. **Run tests when changing behavior** - Verify logic correctness
3. **Keep edits small** - Easier to verify and debug
4. **Rollback on regressions** - Syntax/build/type errors trigger automatic rollback
5. **Use confidence score** - Decide automated vs manual review threshold
6. **Cache verification results** - Avoid redundant checks (invalidate on file change)
7. **Prefer incremental verification** - For large refactors, verify each step
8. **Require manual review for high-risk** - API changes, multi-file refactors

---

## Summary

Cursor does NOT execute tests or builds. It only reads linter output and user feedback. The specification above provides:
- 7 verification levels (syntax to manual)
- Static analysis checklist (always vs optional)
- Dynamic analysis triggers (user/CI driven)
- Risk assessment formula (5 factors)
- Regression detection algorithm (before/after comparison)
- Confidence scoring formula (weighted penalties)
- Rollback criteria (3 automatic, 2 conditional)
- Incremental verification strategy
- Verification caching (file hash + timestamp)
- 4 step-by-step examples
- 3 implementation classes (VerificationOrchestrator, RegressionDetector, IncrementalVerifier)

**Key takeaway**: A2A systems should rely on static analysis (syntax, types, lint) as primary verification, with optional test execution when available. Use confidence scoring and risk assessment to decide when manual review is needed.
