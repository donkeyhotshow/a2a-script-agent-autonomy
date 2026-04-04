import fs from 'fs';
import path from 'path';

class TaskMonitorUtils {
  extractTaskDescription(content) {
    // Try to extract the task description from the markdown file
    // Look for common patterns

    const lines = content.split('\n');

    // Look for ## Agent prompt section and get content after it
    let inAgentPromptSection = false;
    let sectionContent = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('##') && (line.toLowerCase().includes('agent prompt') || line.toLowerCase().includes('task'))) {
        inAgentPromptSection = true;
        continue;
      }
      if (inAgentPromptSection) {
        if (line.startsWith('##') || line.startsWith('# ')) {
          break;
        }
        if (line.length > 0) {
          sectionContent.push(line);
        }
      }
    }
    if (sectionContent.length > 0) {
      return sectionContent.join(' ').trim();
    }

    // Look for lines that start with "Agent prompt" or similar
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('agent prompt') || lines[i].toLowerCase().includes('task:')) {
        // Return the next non-empty line or the rest of the content
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== '') {
            return lines[j].trim();
          }
        }
      }
    }

    // If no specific pattern found, look for first line that is not a header and has substantial content
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && !trimmed.startsWith('#') && !trimmed.startsWith('```') && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
        return trimmed;
      }
    }

    // Fallback: find first non-empty, non-header line with meaningful content
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
        return trimmed;
      }
    }

    // Last resort: use first line if it exists
    return lines.length > 0 ? lines[0].trim() : 'Untitled task';
  }

  async describeAsyncResult(asyncResult, isAsyncPending) {
    const serverBusy = !!asyncResult.execute;
    const llmBusy = isAsyncPending || asyncResult.status === 'processing';
    const detailPieces = [];
    if (asyncResult.execute?.form) {
      detailPieces.push('router/form');
    }
    if (asyncResult.status) {
      detailPieces.push(`status=${asyncResult.status}`);
    }
    if (asyncResult.asyncPending) {
      detailPieces.push('asyncPending');
    }

    this.logHardBit({
      phase: 'poll',
      serverBusy,
      llmBusy,
      detail: detailPieces.join(' | ') || 'poll tick',
    });

    // If still pending, inspect the promise directly on the A2A server
    const promiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;
    if (promiseId && isAsyncPending) {
      const serverPromise = await this.inspectPromise(promiseId);
      if (serverPromise) {
        console.log(`[promise ${promiseId}] server status: ${serverPromise.status}, action: ${serverPromise.action || 'n/a'}`);
      }
    }
  }

  async describeTaskStage(sessionId, asyncResult = null, sessionData = null) {
    const stageInfo = {
      stage: 'unknown',
      detail: 'n/a',
      promiseId: null,
      sessionId: sessionId ?? null
    };
    if (!sessionId && !sessionData && !asyncResult) {
      stageInfo.detail = 'no session or async result information';
      return stageInfo;
    }

    try {
      if (!sessionData && sessionId) {
        sessionData = await this.getSession(sessionId);
      }
    } catch (error) {
      stageInfo.stage = 'session-fetch-error';
      stageInfo.detail = `session fetch failed: ${error.message}`;
      return stageInfo;
    }

    if (!sessionData) {
      stageInfo.detail = 'session data unavailable';
      return stageInfo;
    }

    const execution = sessionData?.context?.execution ?? sessionData?.execute?.execution ?? {};
    const stageParts = [];
    if (execution.action) stageParts.push(`action=${execution.action}`);
    if (execution.step) stageParts.push(`step=${execution.step}`);
    const execStatus = execution.status ?? asyncResult?.status ?? sessionData?.status;
    if (execStatus) stageParts.push(`status=${execStatus}`);
    if (!stageParts.length) {
      stageParts.push(asyncResult?.status ? `status=${asyncResult.status}` : 'unknown');
    }

    const hasRouterForm =
      Boolean(asyncResult?.execute?.form) ||
      Boolean(sessionData?.execute?.form) ||
      Boolean(sessionData?.context?.execution?.form);
    if (hasRouterForm) {
      const formTitle =
        asyncResult?.execute?.form?.title ??
        sessionData?.execute?.form?.title ??
        sessionData?.context?.execution?.form?.title;
      stageParts.push(formTitle ? `awaiting form (${formTitle})` : 'awaiting router form');
    }

    stageInfo.stage = stageParts.join(' | ');
    const detailPieces = [];
    const messageValue =
      sessionData?.context?.execution?.message ??
      sessionData?.context?.result?.message ??
      asyncResult?.result?.message ??
      asyncResult?.execute?.message ??
      null;
    if (messageValue) {
      const messageString = typeof messageValue === 'string' ? messageValue : JSON.stringify(messageValue);
      detailPieces.push(`message=${messageString}`);
    }
    const errorMessage = asyncResult?.result?.error ?? asyncResult?.error;
    if (errorMessage) {
      const errorString = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      detailPieces.push(`error=${errorString}`);
    }
    const promiseId =
      asyncResult?.result?.promiseId ??
      asyncResult?.execute?.promiseId ??
      sessionData?.context?.result?.promiseId ??
      sessionData?.result?.promiseId ??
      null;
    if (promiseId) {
      detailPieces.push(`promiseId=${promiseId}`);
    }

    stageInfo.detail = detailPieces.filter(Boolean).join(' | ') || 'n/a';
    stageInfo.promiseId = promiseId || null;
    return stageInfo;
  }

  async logAgentExecution(sessionId, phase) {
    if (!sessionId) return;
    try {
      const sessionData = await this.getSession(sessionId);
      const exec = sessionData?.context?.execution ?? sessionData?.execute?.execution ?? {};
      const result = sessionData?.context?.result ?? sessionData?.result ?? {};
      const action = exec?.action ?? 'n/a';
      const step = exec?.step ?? 'n/a';
      const status = exec?.status ?? 'n/a';
      const rawMessage = result?.message ?? result?.text ?? exec?.message;
      const message = rawMessage ? (typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage)) : 'n/a';
      console.log(`[agent-mode:${phase}] action=${action} step=${step} status=${status} message=${message}`);
    } catch (error) {
      console.error(`[agent-mode:${phase}] failed to load session ${sessionId}:`, error.message);
    }
  }

  generateSuggestedActions(status, error = null) {
    const actions = [];
    switch (status) {
      case 'timeout':
        actions.push('Check A2A server request processor');
        actions.push('Verify Ollama model availability');
        actions.push('Review session logs for stuck promises');
        break;
      case 'failed':
        if (error && error.includes('server')) {
          actions.push('Restart A2A server components');
          actions.push('Check server logs for errors');
        } else {
          actions.push('Review task description for clarity');
          actions.push('Check session context and execution state');
        }
        break;
      case 'completed':
        actions.push('Verify task completion in target system');
        actions.push('Review generated code/output for correctness');
        break;
      default:
        actions.push('Check A2A server health');
        actions.push('Review session and task logs');
    }
    return actions;
  }

  async createHookDocument(sessionId, taskName, status, error = null, stageInfo = null) {
    const hookId = 'task_monitor_issue';
    const stage = stageInfo?.stage ?? null;
    const stageDetail = stageInfo?.detail ?? null;
    const targetSessionId = stageInfo?.sessionId ?? sessionId ?? this.state.sessionId;
    const promiseId = stageInfo?.promiseId ?? (
      targetSessionId ? await this.getCurrentPromiseId(targetSessionId) : null
    );

    const hookPath = path.join(this.hooksDir, `${hookId}.json`);

    // Read existing hook document if it exists
    let existingDoc = null;
    try {
      if (fs.existsSync(hookPath)) {
        const data = fs.readFileSync(hookPath, 'utf8');
        existingDoc = JSON.parse(data);
      }
    } catch (readError) {
      console.warn(`Could not read existing hook document: ${readError.message}`);
    }

    const newEntry = {
      taskName,
      status,
      error: error || null,
      stage,
      stageDetail,
      context: {
        sessionId,
        promiseId,
        stage,
        stageDetail,
        lastActivity: new Date().toISOString()
      },
      suggestedActions: this.generateSuggestedActions(status, error),
      timestamp: new Date().toISOString()
    };

    let hookDoc;
    if (existingDoc) {
      // Add new entry to existing errors array
      if (!existingDoc.errors) {
        existingDoc.errors = [];
      }
      existingDoc.errors.push(newEntry);
      existingDoc.lastUpdated = new Date().toISOString();
      hookDoc = existingDoc;
      console.log(`Updated hook document with new error: ${hookPath}`);
    } else {
      // Create new hook document
      hookDoc = {
        hookId,
        type: 'task_monitor_issue',
        errors: [newEntry],
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      console.log(`Created new hook document: ${hookPath}`);
    }

    try {
      fs.mkdirSync(this.hooksDir, { recursive: true });
      fs.writeFileSync(hookPath, JSON.stringify(hookDoc, null, 2));
      return hookDoc;
    } catch (error) {
      console.error(`Failed to create/update hook document: ${error.message}`);
      return null;
    }
  }

  async createCompletionReport(sessionId, taskName, result) {
    const reportId = 'task_completion_report';
    const reportDoc = {
      reportId,
      type: 'task_completion_report',
      taskName,
      status: 'completed',
      result: result || null,
      context: {
        sessionId,
        completedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    try {
      fs.mkdirSync(this.hooksDir, { recursive: true });
      const reportPath = path.join(this.hooksDir, `${reportId}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(reportDoc, null, 2));
      console.log(`Created completion report: ${reportPath}`);
      return reportDoc;
    } catch (error) {
      console.error(`Failed to create completion report: ${error.message}`);
      return null;
    }
  }

  /**
   * Deep inspection of session state to identify issues
   * Called when critical/high severity errors occur
   */
  async inspectSessionForErrors(sessionId) {
    const inspection = {
      sessionId,
      timestamp: new Date().toISOString(),
      issues: [],
      diagnostics: {},
      recommendations: []
    };

    try {
      // Fetch session with full context
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        inspection.issues.push({ type: 'session-not-found', severity: 'critical', message: 'Session could not be fetched' });
        return inspection;
      }

      const context = sessionData?.context || {};
      const execution = context?.execution || {};
      const result = context?.result || {};
      const workbench = context?.workbench || {};
      const history = context?.history || [];

      inspection.diagnostics.session = {
        id: sessionData.id,
        stepNum: sessionData.stepNum,
        hasContext: !!sessionData.context,
        historyLength: history.length
      };

      // Check execution state
      inspection.diagnostics.execution = {
        action: execution.action,
        step: execution.step,
        status: execution.status,
        hasForm: !!execution.form,
        formChoicesCount: execution.form?.choices?.length || 0
      };

      // Issue: Stuck in routing with no choices
      if (execution.action === 'router' && (!execution.form?.choices || execution.form.choices.length === 0)) {
        inspection.issues.push({
          type: 'router-stuck-no-choices',
          severity: 'high',
          message: 'Router action but no form choices available - dialog may be stuck'
        });
        inspection.recommendations.push('Check if task was sent correctly in Beat A (message) vs Beat B (choice)');
        inspection.recommendations.push('Verify router-static-choices.json is configured');
      }

      // Issue: Form has choices but no selection made
      if (execution.form?.choices && execution.form.choices.length > 0 && execution.action !== 'agent') {
        inspection.issues.push({
          type: 'router-choice-pending',
          severity: 'medium',
          message: `Router waiting for choice: ${execution.form.choices.map(c => c.id).join(', ')}`,
          choices: execution.form.choices
        });
        inspection.recommendations.push(`Send choice ID: ${execution.form.choices[0].id} to proceed`);
      }

      // Issue: Long history without result
      if (history.length > 10 && !result?.message) {
        inspection.issues.push({
          type: 'long-history-no-result',
          severity: 'medium',
          message: `History has ${history.length} entries but no result yet - may be stuck in loop`
        });
        inspection.recommendations.push('Gray room is on by default; if stuck, check A2A_GRAY_ROOM_MAX_TURNS / interrupt budget or set A2A_GRAY_ROOM_ENABLED=0 to simplify');
      }

      // Issue: Promise stuck
      const promiseId = result?.promiseId;
      if (promiseId) {
        try {
          const serverPromise = await this.inspectPromise(promiseId);
          inspection.diagnostics.promise = {
            id: promiseId,
            status: serverPromise?.status,
            action: serverPromise?.action
          };

          if (serverPromise?.status === 'processing' && history.length > 5) {
            inspection.issues.push({
              type: 'promise-long-processing',
              severity: 'medium',
              message: `Promise ${promiseId} processing for extended time with ${history.length} history entries`
            });
            inspection.recommendations.push('Check if Ollama is actually generating: curl http://localhost:11435/api/ps');
          }
        } catch (e) {
          inspection.issues.push({
            type: 'promise-inspect-failed',
            severity: 'medium',
            message: `Could not inspect promise ${promiseId}: ${e.message}`
          });
        }
      }

      // Issue: Action-key shape violations
      const execKeys = sessionData.execute ? Object.keys(sessionData.execute) : [];
      if (execKeys.length > 1) {
        inspection.issues.push({
          type: 'action-key-shape-violation',
          severity: 'high',
          message: `Execute has ${execKeys.length} keys - should have exactly 1 (Action-Key Shape violation)`
        });
        inspection.recommendations.push('Review AGENTS.md Action-Key Shape section');
        inspection.recommendations.push('Run: npm run sim:lint -- --all');
      }

      // Issue: Workbench errors
      if (workbench?.error || workbench?.sections?.some(s => s.error)) {
        inspection.issues.push({
          type: 'workbench-error',
          severity: 'high',
          message: 'Workbench contains error state'
        });
      }

      // Check for interrupt state
      if (execution.interrupt) {
        inspection.diagnostics.interrupt = execution.interrupt;
        inspection.issues.push({
          type: 'interrupt-pending',
          severity: 'medium',
          message: `Interrupt pending: ${execution.interrupt.reason}`,
          interrupt: execution.interrupt
        });
        inspection.recommendations.push(`Check interrupt.reason: ${execution.interrupt.reason}`);
      }

    } catch (error) {
      inspection.issues.push({
        type: 'inspection-error',
        severity: 'high',
        message: `Failed to inspect session: ${error.message}`
      });
    }

    return inspection;
  }

  /**
   * Print formatted session inspection results
   */
  printSessionInspection(inspection) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`SESSION INSPECTION: ${inspection.sessionId}`);
    console.log(`${'='.repeat(70)}`);

    if (inspection.issues.length === 0) {
      console.log('✓ No issues detected in session state');
    } else {
      console.log(`\n⚠ FOUND ${inspection.issues.length} ISSUE(S):\n`);

      for (const issue of inspection.issues) {
        const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
        console.log(`${severityIcon} [${issue.severity.toUpperCase()}] ${issue.type}`);
        console.log(`   Message: ${issue.message}`);

        if (issue.choices) {
          console.log(`   Available choices:`);
          for (const choice of issue.choices) {
            console.log(`     - ${choice.id}: ${choice.label}${choice.description ? ` (${choice.description})` : ''}`);
          }
        }

        if (issue.interrupt) {
          console.log(`   Interrupt details:`, JSON.stringify(issue.interrupt, null, 2).replace(/\n/g, '\n   '));
        }

        console.log('');
      }
    }

    if (inspection.recommendations.length > 0) {
      console.log(`RECOMMENDATIONS:\n`);
      for (const rec of inspection.recommendations) {
        console.log(`  → ${rec}`);
      }
      console.log('');
    }

    // Print diagnostics summary
    if (inspection.diagnostics.execution) {
      const exec = inspection.diagnostics.execution;
      console.log(`EXECUTION STATE: action=${exec.action || 'n/a'} step=${exec.step || 'n/a'} status=${exec.status || 'n/a'}`);
      if (exec.hasForm) {
        console.log(`FORM: ${exec.formChoicesCount} choice(s) available`);
      }
    }

    if (inspection.diagnostics.promise) {
      const prom = inspection.diagnostics.promise;
      console.log(`PROMISE: id=${prom.id} status=${prom.status || 'n/a'}`);
    }

    console.log(`${'='.repeat(70)}\n`);
  }
}

export { TaskMonitorUtils };