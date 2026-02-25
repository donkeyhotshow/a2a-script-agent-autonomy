# Standards Review Summary

## script/docs/standards/scenario-engine/scenario-standard.json

**Purpose:** Defines required JSON structure for scenario files.

- Required fields: scenarioId, title, description, version, startStepId, steps
- Step structure: id, type (Question, Action, Decision, Info, End), text, input, action, nextStepId, nextStepIdDecision,
  message
  **Suggestions:** Clarify action vs input, nextStepIdDecision structure, and relationship to
  question-to-user-standard.json.

## script/docs/standards/scenario-engine/information-gathering-process-standard.json

**Purpose:** Standard algorithm for AI to gather, analyze, and present project info.

- Steps: keyword extraction, index search, codebase/doc search, aggregation, analysis, targeted reading, synthesis,
  output
  **Suggestions:** Resolve TBD index path, clarify QTU element index, define Task Card format, fix docs/ typo.

## script/docs/standards/scenario-engine/prompts-structure-standard.json

**Purpose:** Schema for prompts in task type data files.

- Fields: internalAnalysisPrompt, planningPrompt, checklistGenerationPrompt, postProcessingPrompt,
  output.filePathTemplate, output.closeScenario, output.activateDependencyScenario
  **Suggestions:** Add prompt rationale, placeholder list, ensure prompt content quality.

## script/docs/standards/scenario-engine/question-to-user-standard.json & ai-agent version

**Purpose:** JSON-based system for interactive scenario workflows.

- scenario-engine version: More detailed step structure (Question, Action, Info, Decision)
- ai-agent version: More generic, includes phased development approach
  **Suggestions:** Merge into one, use detailed step structure, include phased development, standardize field names,
  clarify file root.

## script/docs/standards/scenario-engine/session-initiation-standard.json & ai-agent version

**Purpose:** Steps for AI to start a session without prior context.

- Steps: acknowledge, request input, gather info, initiate mode system
  **Suggestions:** Consolidate to one file, verify referenced files, elaborate on mode system, align terminology with
  Scan-Plan-Refine.

## script/docs/standards/developer/powershell-scripting-standards.json

**Purpose:** Comprehensive PowerShell scripting standards.

- Naming, structure, error handling, modularity, integration, logging, automation, partials, fact-based ops
  **Suggestions:** Update TBD references, ensure examples in markdown, consider linter config.

## script/docs/standards/developer/iterative-debugging-standard.json & ai-agent version

**Purpose:** Iterative debugging approach for CLI tools and app flows.

- Steps: reproduce, analyze, log, hypothesize, test, repeat, document, clean up
  **Suggestions:** Use developer version as canonical, remove/redirect ai-agent version, update TODO guides, align
  PowerShell logging.

## script/docs/standards/developer/code-standards.json

**Purpose:** Key standards for Laravel/PHP code, mostly placeholders.
**Suggestions:** Populate examples, add actionable next steps, link to official docs, use checklist/table format.

## script/docs/standards/developer/artisan-command-development-standard.json

**Purpose:** Best practices for Laravel Artisan commands, focus on logging.

- Separate log files, auto-clear logs, logging levels, log access, error handling, example code
  **Suggestions:** Add quick checklist, document log paths, provide show:log template.

## script/docs/standards/developer/ps1-creation-standard.json

**Purpose:** PowerShell script creation requirements and best practices.

- Structure, params, fail-fast, partials, error handling, logging, automation, fact-based ops
  **Suggestions:** Add compliance checklist, inline rationale, provide template script.

## script/docs/standards/developer/ui-json-validation-standards.json

**Purpose:** Unified standard for validating JSON UI components.

- Rule file schema, nested validation, error codes
  **Suggestions:** Verify file paths, add real example, link error codes to examples, cross-reference related standards.

## script/docs/standards/developer/ui-core-standards.json

**Purpose:** Standards for core UI elements and architecture (Vue 3, PrimeVue).

- Component library, custom components, styling, state, accessibility, JSON UI structure
  **Suggestions:** Fill in TBD guides, verify paths, add examples, cross-link to validation/templating standards.

## script/docs/standards/developer/ui-templating-standards.json

**Purpose:** Standards for JSON UI templates.

- JSON schema, template organization, reusability, dynamic content
  **Suggestions:** Create definitive schema doc, add guides/examples, verify paths.

## script/docs/standards/developer/vertical-slice-architecture-standard.json

**Purpose:** Guidelines for feature-based (vertical slice) architecture.

- Feature cohesion, slice independence, shared components, evolution path
  **Suggestions:** Add real project examples, clarify promotion criteria, cross-link to partials standards.

## script/docs/standards/task-manager/TASKMANAGER-task-closure-standard.json

**Purpose:** Standard for closing/finalizing tasks.

- Workflow: check criteria, confirm, close, archive, report
  **Suggestions:** Add closure checklist, report template, clarify archiving, align with automation.

## script/docs/standards/task-manager/TASKMANAGER-task-tracking-standard.json

**Purpose:** Standard for tracking/controlling tasks.

- Workflow: register, assign, track, escalate, close
  **Suggestions:** Add tracking checklist, notification/escalation templates, clarify escalation, integrate with
  automation.

## script/docs/standards/task-manager/task-types-standards-map.json

**Purpose:** Maps task types to required standards.
**Suggestions:** Ensure path consistency, update with new types/standards, add last updated field, automate path
validation.

## script/docs/standards/task-manager/index-data-workflow.md

**Purpose:** Describes data indexing/retrieval workflow and tools.

- Manual tagging, main-index.ps1, PHP scenario engine, enhanced output
  **Suggestions:** Add diagram, sample tagging entry, automate validation, verify all paths.

## script/docs/standards/system/SYSTEM-backup-standard.json

**Purpose:** Standard for backup and recovery for the System role.

- Workflow: schedule backups, perform backup, verify integrity, secure storage, restore as needed
- Statuses: scheduled, in-progress, completed, failed, restored
- Requirements: daily backups, weekly integrity checks
- Anti-patterns: no integrity checks, insecure storage
  **Suggestions:** Finalize draft, add backup/restore checklists, clarify secure storage, reference automation/scripts,
  align with logging/maintenance standards.

## script/docs/standards/system/SYSTEM-logging-standard.json

**Purpose:** Standard for system event and error logging for the System role.

- Workflow: configure logging, collect logs, centralized storage, analyze, delete old logs
- Statuses: active, archived, deleted
- Requirements: logs must have timestamps, levels, session IDs; retain for at least 90 days
- Anti-patterns: missing timestamps/IDs, premature deletion
  **Suggestions:** Finalize draft, add log format/sample, clarify centralized storage, reference log analysis tools,
  align with backup/maintenance standards.

## script/docs/standards/system/SYSTEM-maintenance-standard.json

**Purpose:** Standard for system maintenance and support for the System role.

- Workflow: plan maintenance, notify stakeholders, perform maintenance, verify, document/analyze
- Statuses: planned, in-progress, completed, failed, archived
- Requirements: maintenance in scheduled windows, notify all stakeholders
- Anti-patterns: no notification, no post-maintenance verification
  **Suggestions:** Finalize draft, add maintenance checklist, notification templates, clarify verification steps, align
  with backup/logging standards.

## script/docs/standards/reviewer/REVIEWER-approval-criteria-standard.json

**Purpose:** Defines approval criteria for changes for the Reviewer role.

- Workflow: receive changes, compare to criteria, record match/mismatch, decide, document decision
- Statuses: pending, approved, rejected, needs-changes
- Requirements: criteria must be transparent/unambiguous, decision recorded
- Anti-patterns: approval without checking, no decision documentation
  **Suggestions:** Finalize draft, link to specific checklists/criteria examples, clarify decision documentation
  process/tools, align with feedback/review process standards.

## script/docs/standards/reviewer/REVIEWER-feedback-standard.json

**Purpose:** Standard for providing feedback for the Reviewer role.

- Workflow: analyze changes, formulate comments/suggestions, provide feedback, record feedback, track resolution
- Statuses: pending, provided, addressed, archived
- Requirements: feedback must be constructive/substantial, all comments recorded
- Anti-patterns: vague feedback, unrecorded comments
  **Suggestions:** Finalize draft, provide feedback templates/examples, clarify recording system, link to style guides
  for feedback, align with review process/approval criteria.

## script/docs/standards/reviewer/REVIEWER-review-process-standard.json

**Purpose:** Standard for the process of reviewing tasks and changes for the Reviewer role.

- Workflow: receive for review, analyze/record comments, provide feedback, re-review, decide approval/rejection
- Statuses: pending, in-review, changes-requested, approved, rejected
- Requirements: each change reviewed by >=1 reviewer, results recorded
- Anti-patterns: approval without recording comments, skipping re-review
  **Suggestions:** Finalize draft, add review checklist, clarify recording system/tools, align with feedback/approval
  criteria standards.

## Comprehensive Conversation Summary

1. Сессия была инициирована через структурированный запрос с использованием методологии Scan-Plan-Refine, нацеленной на
   сканирование, планирование и уточнение понимания AI Task System.
2. Изначально планировалась полная переработка файла copilot-promt.md, но затем было решено проводить поэтапные
   изменения с систематическим исследованием структуры проекта.
3. Ассистент провёл детальный обзор файловой структуры проекта, используя вызовы инструментов для просмотра директорий и
   файлов (например, script/engine/ и script/docs/standards/), что позволило составить общее представление о
   компонентной архитектуре и стандартах.
4. Были проанализированы файлы стандартов из разных разделов проекта (scenario-engine, developer, task-manager, system,
   reviewer) с указанием целей, ключевых полей и предложений по улучшению каждого документа.
5. Результаты анализа были сводно оформлены в файл standards-review-summary.md, демонстрируя состояние документации
   стандартов проекта и рекомендации по оптимизации.
6. По указанию пользователя документ был дополнен детальным описанием всех этапов беседы, включая вызовы инструментов,
   стратегии анализа и итоговые выводы по интеграции системы.

---

(Continue with remaining standards and processes files...) 
