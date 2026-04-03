# Cursor Answer: Code Quality & Testing Actions Workflow

**Date**: 2024
**Question**: `.amazonq/questions-to-cursor/actions/QUALITY-TESTING-WORKFLOW.md`
**Status**: ✅ Collected (11/11) - COMPLETE

---

## Cursor's Response

### Clarification

Cursor does NOT run automated code-quality or testing pipelines. It uses `read_lints` when editing and relies on user feedback.

Below is a design specification for A2A implementation.

---

## 1. Integration Workflow

```
Code change
  ↓
on-save: lint, basic quality (complexity, length)
  ↓
on-commit: duplication, SOLID, tests run
  ↓
pre-push: full quality audit, coverage check
  ↓
Quality issues found?
  ↓ yes
Suggest refactoring | Auto-fix (if safe)
  ↓
Tests exist? → no → suggest / generate tests
  ↓ yes
Apply refactoring
  ↓
Run tests
  ↓ pass
Commit
  ↓ fail
Rollback, report
```

---

## 2. Execution Timing

| timing | quality actions | testing actions | rationale |
|--------|-----------------|-----------------|-----------|
| on-type | naming hints | — | instant |
| on-save | smells, complexity, duplication | missing-tests | fast feedback |
| on-commit | SOLID, duplication | unit tests | gate |
| on-pr | full audit | full suite, coverage, mutation | full check |
| background | debt, metrics | coverage | periodic |

---

## 3. Priority Matrix

| priority | severity | impact | examples | action |
|----------|----------|--------|----------|--------|
| critical | high | high | god-object, no tests critical path, complexity 50+ | block-commit |
| high | high | medium | long method 100+, missing public API tests, nesting 5+ | strong-warn |
| medium | medium | medium | duplication 3+, coverage <80%, magic numbers | suggest |
| low | low | low | missing docblocks, naming, unused imports | info |

---

## 4. Safe Refactoring Algorithm

```
1. detectExistingTests(targetCode)
2. if none: generateTests(targetCode) → runTests → must pass on original
3. backup = snapshot(code)
4. refactored = applyRefactoring(code, issue)
5. runTests(existingOrGenerated)
6. if fail: rollback(backup), report
7. qualityAfter = analyzeQuality(refactored)
8. if qualityAfter <= qualityBefore: warn "no improvement"
9. return success
```

---

## 5. Test Generation Strategy

| when | targets | rationale |
|------|---------|-----------|
| always | public API, critical logic | high value, low risk |
| if missing | complex methods, error paths | regression protection |
| on-request | simple utils, getters | low ROI |
| never auto | UI, e2e, integration | needs manual design |

---

## 6. Quality Metrics

| metric | calculation | warn | block |
|--------|-------------|------|-------|
| cyclomatic-complexity | per method | 10 | 20 |
| method-length | LOC | 50 | 100 |
| class-size | methods | 20 | 50 |
| duplication | % | 5% | 10% |
| coverage | % | <80% | <60% |
| nesting-depth | levels | 4 | 6 |
| maintainability-index | 0–100 | 70 | 50 |

---

## 7. Batch Analysis

```javascript
const phases = [
  { name: 'quick', actions: ['smells', 'naming', 'unused'], parallel: true, timeout: 30 },
  { name: 'deep', actions: ['solid', 'patterns', 'metrics'], parallel: true, timeout: 120 },
  { name: 'tests', actions: ['missing-tests', 'coverage', 'flaky'], parallel: false, timeout: 180 },
];

// Aggregate: groupBy severity, sortBy priority, limit 100
```

---

## 8. Incremental Analysis

```
1. changedFiles = diff.files
2. affectedFiles = changedFiles + dependents(changedFiles)
3. qualityIssues = runQualityChecks(affectedFiles)
4. affectedTests = testsFor(affectedFiles)
5. testResults = runTests(affectedTests)
6. delta = compare(baseline, current)
7. return { newIssues: delta.new, fixed: delta.fixed, testResults }
```

---

## 9. Auto-fix Capabilities

| issue | auto-fix | confidence | validation |
|-------|----------|------------|------------|
| unused-imports | ✅ | 100% | syntax |
| naming | ✅ | 95% | tests |
| magic-numbers | ✅ | 90% | tests |
| duplication | ⏳ | 70% | review |
| long-method | ❌ | 50% | manual |
| god-object | ❌ | 30% | manual |

---

## 10. Learning and Improvement

```javascript
// Track trends
trends: { complexity, duplication, coverage } → compare current vs target

// Patterns
patterns: frequent smells, low-coverage areas → suggest focus

// Adaptive thresholds
adjusted = projectAverage * 1.2 // stricter if project is cleaner
```

---

## 11. Examples

### Example 1: God Object

```
1. Quality: detect god object, complexity, no tests
2. Suggestions: split into smaller services
3. Tests: generate tests for current behavior
4. Split: UserService → UserValidator, UserRepository, UserNotifier
5. Validate: tests pass, complexity reduced
```

### Example 2: Test Coverage

```
1. Coverage: identify uncovered branches/files
2. Prioritize: error paths > edge cases > private
3. Generate: tests for highest-priority gaps
4. Validate: coverage up, tests meaningful
```

### Example 3: PR Automation

```
1. Quality: quick + deep phases
2. Tests: affected tests + coverage
3. Group: by severity → by file
4. Auto-fix: unused imports, simple naming
5. Manual: refactoring, architectural changes
```

---

## Key Insights

### INSIGHT 1: No Automated Quality/Testing Pipeline
Cursor does NOT run automated code quality or testing pipelines. It uses `read_lints` for linter output and relies on user feedback. No orchestration layer exists.

### INSIGHT 2: Timing-Based Execution
Quality and testing actions triggered by timing:
- **on-type**: Instant feedback (naming hints)
- **on-save**: Fast checks (smells, complexity, duplication, missing tests)
- **on-commit**: Gate checks (SOLID, duplication, unit tests)
- **on-pr**: Full audit (complete suite, coverage, mutation testing)
- **background**: Periodic analysis (technical debt, metrics, coverage)

### INSIGHT 3: 4-Tier Priority System
Findings prioritized by severity × impact:
- **Critical**: Block commit (god-object, no critical tests, complexity 50+)
- **High**: Strong warning (long method 100+, missing API tests, nesting 5+)
- **Medium**: Suggest (duplication 3+, coverage <80%, magic numbers)
- **Low**: Info only (missing docs, naming, unused imports)

### INSIGHT 4: Safe Refactoring Protocol
8-step algorithm:
1. Detect existing tests
2. Generate tests if none (must pass on original)
3. Create backup
4. Apply refactoring
5. Run tests
6. Rollback if tests fail
7. Verify quality improved
8. Return success or warning

### INSIGHT 5: Test Generation Strategy
4 categories:
- **Always**: Public API, critical logic (high value, low risk)
- **If missing**: Complex methods, error paths (regression protection)
- **On request**: Simple utils, getters (low ROI)
- **Never auto**: UI, e2e, integration (needs manual design)

### INSIGHT 6: Quality Metrics Thresholds
7 metrics with warn/block thresholds:
- Cyclomatic complexity: warn 10, block 20
- Method length: warn 50 LOC, block 100 LOC
- Class size: warn 20 methods, block 50 methods
- Duplication: warn 5%, block 10%
- Coverage: warn <80%, block <60%
- Nesting depth: warn 4 levels, block 6 levels
- Maintainability index: warn 70, block 50

### INSIGHT 7: 3-Phase Batch Analysis
- **Quick scan** (30s): Smells, naming, unused code (parallel)
- **Deep analysis** (120s): SOLID, patterns, metrics (parallel)
- **Test analysis** (180s): Missing tests, coverage, flaky tests (sequential)
- Aggregate: Group by severity, sort by priority, limit 100

### INSIGHT 8: Incremental Analysis Strategy
7-step delta analysis:
1. Identify changed files
2. Find affected files (dependents)
3. Run quality checks on affected
4. Find affected tests
5. Run affected tests
6. Compare with baseline
7. Report new issues and fixed issues

### INSIGHT 9: Auto-fix Confidence Levels
6 issue types with confidence:
- **100% (auto)**: Unused imports (syntax validation)
- **95% (auto)**: Naming conventions (tests validation)
- **90% (auto)**: Magic numbers (tests validation)
- **70% (review)**: Code duplication (manual review)
- **50% (manual)**: Long methods (manual only)
- **30% (manual)**: God objects (manual only)

### INSIGHT 10: Adaptive Learning
3 learning mechanisms:
- **Trends**: Track complexity, duplication, coverage vs targets
- **Patterns**: Identify frequent smells and low-coverage areas
- **Adaptive thresholds**: Adjust based on project average (stricter if cleaner)

---

## A2A Implementation

### QualityTestingOrchestrator Class

```javascript
class QualityTestingOrchestrator {
  constructor() {
    this.phases = this.initPhases();
    this.metrics = this.initMetrics();
    this.trends = new Map();
  }

  initPhases() {
    return [
      {
        name: 'quick',
        actions: ['detect-smells', 'detect-naming', 'detect-unused'],
        parallel: true,
        timeout: 30000,
      },
      {
        name: 'deep',
        actions: ['detect-solid', 'detect-patterns', 'calculate-metrics'],
        parallel: true,
        timeout: 120000,
      },
      {
        name: 'tests',
        actions: ['detect-missing-tests', 'analyze-coverage', 'detect-flaky'],
        parallel: false,
        timeout: 180000,
      },
    ];
  }

  initMetrics() {
    return {
      'cyclomatic-complexity': { warn: 10, block: 20 },
      'method-length': { warn: 50, block: 100 },
      'class-size': { warn: 20, block: 50 },
      'duplication': { warn: 5, block: 10 },
      'coverage': { warn: 80, block: 60 },
      'nesting-depth': { warn: 4, block: 6 },
      'maintainability-index': { warn: 70, block: 50 },
    };
  }

  async executeWorkflow(change, timing) {
    const workflow = this.getWorkflow(timing);
    const results = {
      qualityIssues: [],
      testResults: null,
      autoFixes: [],
      suggestions: [],
    };

    // 1. Run quality checks
    const qualityIssues = await this.runQualityChecks(change, workflow.qualityActions);
    results.qualityIssues = this.prioritizeIssues(qualityIssues);

    // 2. Check for missing tests
    const missingTests = await this.detectMissingTests(change);
    if (missingTests.length > 0) {
      results.suggestions.push({
        type: 'generate-tests',
        targets: missingTests,
      });
    }

    // 3. Auto-fix safe issues
    const autoFixable = this.getAutoFixable(results.qualityIssues);
    for (const issue of autoFixable) {
      const fix = await this.applyAutoFix(issue);
      if (fix.success) {
        results.autoFixes.push(fix);
      }
    }

    // 4. Run tests if needed
    if (workflow.runTests) {
      results.testResults = await this.runTests(change);
    }

    return results;
  }

  getWorkflow(timing) {
    const workflows = {
      'on-type': {
        qualityActions: ['naming-hints'],
        runTests: false,
      },
      'on-save': {
        qualityActions: ['smells', 'complexity', 'duplication'],
        testingActions: ['missing-tests'],
        runTests: false,
      },
      'on-commit': {
        qualityActions: ['solid', 'duplication'],
        testingActions: ['unit-tests'],
        runTests: true,
      },
      'on-pr': {
        qualityActions: ['full-audit'],
        testingActions: ['full-suite', 'coverage', 'mutation'],
        runTests: true,
      },
      'background': {
        qualityActions: ['debt', 'metrics'],
        testingActions: ['coverage-analysis'],
        runTests: false,
      },
    };

    return workflows[timing] || workflows['on-save'];
  }

  prioritizeIssues(issues) {
    const prioritized = issues.map(issue => ({
      ...issue,
      priority: this.calculatePriority(issue),
    }));

    return prioritized.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  calculatePriority(issue) {
    const { severity, impact } = issue;

    if (severity === 'high' && impact === 'high') return 'critical';
    if (severity === 'high' && impact === 'medium') return 'high';
    if (severity === 'medium' && impact === 'medium') return 'medium';
    return 'low';
  }

  getAutoFixable(issues) {
    const autoFixConfidence = {
      'unused-imports': 100,
      'naming-convention': 95,
      'magic-numbers': 90,
    };

    return issues.filter(issue => {
      const confidence = autoFixConfidence[issue.type];
      return confidence && confidence >= 90;
    });
  }

  async applyAutoFix(issue) {
    const backup = await this.createBackup(issue.file);

    try {
      const fixed = await this.fix(issue);
      
      // Validate
      const valid = await this.validate(fixed, issue.type);
      if (!valid) {
        await this.rollback(backup);
        return { success: false, error: 'validation-failed' };
      }

      return { success: true, issue, fixed };
    } catch (error) {
      await this.rollback(backup);
      return { success: false, error: error.message };
    }
  }

  async validate(fixed, issueType) {
    const validations = {
      'unused-imports': ['syntax'],
      'naming-convention': ['syntax', 'tests'],
      'magic-numbers': ['syntax', 'tests'],
    };

    const checks = validations[issueType] || ['syntax'];

    for (const check of checks) {
      const result = await this.runValidation(check, fixed);
      if (!result.passed) return false;
    }

    return true;
  }
}
```

### SafeRefactoringEngine Class

```javascript
class SafeRefactoringEngine {
  async refactor(code, issue) {
    // 1. Detect existing tests
    const existingTests = await this.detectExistingTests(code);

    // 2. Generate tests if none
    if (existingTests.length === 0) {
      const generatedTests = await this.generateTests(code);
      
      // Must pass on original
      const baseline = await this.runTests(generatedTests, code);
      if (!baseline.allPass) {
        return {
          error: 'Generated tests fail on original code',
          tests: generatedTests,
        };
      }

      existingTests.push(...generatedTests);
    }

    // 3. Create backup
    const backup = await this.snapshot(code);

    // 4. Apply refactoring
    const refactored = await this.applyRefactoring(code, issue);

    // 5. Run tests
    const testResults = await this.runTests(existingTests, refactored);

    if (!testResults.allPass) {
      // 6. Rollback
      await this.rollback(backup);
      return {
        error: 'Tests fail after refactoring',
        rollback: true,
        testResults,
      };
    }

    // 7. Check quality improved
    const qualityBefore = await this.analyzeQuality(code);
    const qualityAfter = await this.analyzeQuality(refactored);

    if (qualityAfter.score <= qualityBefore.score) {
      return {
        warning: 'Quality not improved',
        qualityBefore,
        qualityAfter,
        refactored,
      };
    }

    return {
      success: true,
      refactored,
      qualityImprovement: qualityAfter.score - qualityBefore.score,
      testResults,
    };
  }

  async generateTests(code) {
    const strategy = this.getTestGenerationStrategy(code);
    const tests = [];

    for (const target of strategy.targets) {
      const testCases = await this.generateTestCases(target);
      tests.push(...testCases);
    }

    return tests;
  }

  getTestGenerationStrategy(code) {
    const analysis = this.analyzeCode(code);

    const strategy = {
      always: [],
      ifMissing: [],
      onRequest: [],
      never: [],
    };

    // Categorize methods
    for (const method of analysis.methods) {
      if (method.isPublicAPI || method.isCritical) {
        strategy.always.push(method);
      } else if (method.isComplex || method.hasErrorHandling) {
        strategy.ifMissing.push(method);
      } else if (method.isSimple) {
        strategy.onRequest.push(method);
      } else if (method.isUI || method.isIntegration) {
        strategy.never.push(method);
      }
    }

    return {
      targets: [...strategy.always, ...strategy.ifMissing],
      strategy,
    };
  }
}
```

### IncrementalAnalyzer Class

```javascript
class IncrementalAnalyzer {
  async analyze(diff) {
    // 1. Identify changed files
    const changedFiles = diff.files;

    // 2. Find affected files
    const affectedFiles = await this.findAffectedFiles(changedFiles);

    // 3. Run quality checks
    const qualityIssues = await this.runQualityChecks(affectedFiles);

    // 4. Find affected tests
    const affectedTests = await this.findAffectedTests(affectedFiles);

    // 5. Run tests
    const testResults = await this.runTests(affectedTests);

    // 6. Compare with baseline
    const baseline = await this.getBaseline();
    const delta = this.compareWithBaseline(qualityIssues, baseline);

    // 7. Return delta
    return {
      newIssues: delta.new,
      fixedIssues: delta.fixed,
      testResults,
      affectedFiles: affectedFiles.length,
    };
  }

  async findAffectedFiles(changedFiles) {
    const affected = new Set(changedFiles);

    for (const file of changedFiles) {
      const dependents = await this.findDependents(file);
      dependents.forEach(d => affected.add(d));
    }

    return Array.from(affected);
  }

  compareWithBaseline(current, baseline) {
    const currentMap = new Map(current.map(i => [i.id, i]));
    const baselineMap = new Map(baseline.map(i => [i.id, i]));

    const newIssues = current.filter(i => !baselineMap.has(i.id));
    const fixedIssues = baseline.filter(i => !currentMap.has(i.id));

    return { new: newIssues, fixed: fixedIssues };
  }
}
```

---

## Best Practices Summary

1. **Run quality checks on-save** for fast feedback
2. **Generate tests before refactoring** to ensure safety
3. **Auto-fix only high-confidence issues** (90%+)
4. **Prioritize by severity × impact** (critical blocks commit)
5. **Use incremental analysis** for large codebases
6. **Track trends over time** to guide improvements
7. **Adapt thresholds** based on project quality
8. **Run full audit on PR** for comprehensive check
9. **Rollback on test failures** after refactoring
10. **Validate quality improved** after changes

---

## Summary

Cursor does NOT run automated quality/testing pipelines. It uses `read_lints` and user feedback. The specification above provides:
- Integration workflow (8 steps from change to commit)
- Execution timing matrix (5 timings × quality/testing actions)
- 4-tier priority system (critical/high/medium/low)
- Safe refactoring algorithm (8 steps with test generation)
- Test generation strategy (4 categories: always/if-missing/on-request/never)
- Quality metrics (7 metrics with warn/block thresholds)
- 3-phase batch analysis (quick/deep/tests)
- Incremental analysis (7-step delta analysis)
- Auto-fix capabilities (6 issue types with confidence levels)
- Learning algorithm (trends, patterns, adaptive thresholds)
- 3 practical examples (god object, test coverage, PR automation)
- 3 implementation classes (QualityTestingOrchestrator, SafeRefactoringEngine, IncrementalAnalyzer)

**Key takeaway**: A2A systems should integrate quality and testing workflows with timing-based execution, safe refactoring protocols, and adaptive learning. Always generate tests before refactoring and rollback on failures.
