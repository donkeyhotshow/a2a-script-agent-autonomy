import axios from 'axios';
import fs from 'fs';
import path from 'path';

class ServerUnavailableError extends Error {
  constructor(message = 'A2A server unavailable') {
    super(message);
    this.name = 'ServerUnavailableError';
  }
}

class TaskMonitor {
  constructor() {
    this.baseUrl = 'http://localhost:5173/api/a2a';
    this.projectId = 'p_1771576028988'; // From projects endpoint
    this.stateFile = path.join(process.cwd(), 'task-monitor-state.json');
    this.tasksDir = path.join(process.cwd(), 'prompts-to-agent-mode');
    this.hooksDir = path.join(process.cwd(), 'hooks');
    this.serverBaseUrl = 'http://localhost:3000/api/v1';
    this.hardbitState = { server: false, llm: false, client: true };
    this.activeTasks = new Map(); // sessionId -> task metadata
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);

        // Restore active tasks if in daemon mode
        if (this.state.activeTasks) {
          this.activeTasks = new Map(Object.entries(this.state.activeTasks));
        }

        console.log(`Loaded state: ${JSON.stringify(this.state)}`);
      } else {
        this.state = this.buildInitialState();
        this.saveState();
      }
    } catch (error) {
      console.error('Error loading state:', error);
      this.state = this.buildInitialState();
      this.state.status = 'error';
      this.activeTasks.clear();
    }
  }

  buildInitialState() {
    return {
      lastChecked: null,
      processedTasks: [],
      currentTask: null,
      sessionId: null,
      status: 'idle',
      activeTasks: {}
    };
  }

  resetStateForFreshRun() {
    console.log('Clearing previous monitor state for a fresh run...');
    this.activeTasks.clear();
    // Keep processedTasks to avoid reprocessing completed/failed tasks
    const processedTasks = this.state.processedTasks || [];
    this.state = this.buildInitialState();
    this.state.processedTasks = processedTasks;
    this.saveState();
  }

  saveState() {
    try {
      this.state.lastChecked = new Date().toISOString();
      // Convert Map to object for JSON serialization
      this.state.activeTasks = Object.fromEntries(this.activeTasks);
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  recordProcessedTask(taskName, status, detail) {
    this.state.processedTasks = this.state.processedTasks || [];
    this.state.processedTasks = this.state.processedTasks.filter(entry => entry.name !== taskName);
    this.state.processedTasks.push({
      name: taskName,
      status,
      detail: detail || null,
      updatedAt: new Date().toISOString()
    });
  }

  async getProjects() {
    try {
      const response = await axios.get(`${this.baseUrl}/projects`);
      return response.data.projects;
    } catch (error) {
      console.error('Error fetching projects:', error.message);
      return [];
    }
  }

  async createSession(taskText) {
    try {
      const response = await axios.post(`${this.baseUrl}/sessions`, {
        projectId: this.projectId,
        mode: 'agent',
        task: taskText
      });
      // The response format is { success: true, session: { ... } }
      return response.data.session || response.data;
    } catch (error) {
      console.error('Error creating session:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  }

  async sendNext(sessionId, payload = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/sessions/${sessionId}/next`, payload);
      // Handle different response formats
      if (response.data && response.data.execute) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      if (this.isServerUnavailableError(error)) {
        throw new ServerUnavailableError(error.response?.data?.error);
      }
      console.error('Error sending next:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  }

  async pollAsync(sessionId) {
    try {
      const response = await axios.get(`${this.baseUrl}/sessions/${sessionId}/async`);
      return response.data;
    } catch (error) {
      if (this.isServerUnavailableError(error)) {
        throw new ServerUnavailableError(error.response?.data?.error);
      }
      console.error('Error polling async:', error.message);
      return null;
    }
  }

  async getSession(sessionId) {
    try {
      if (!sessionId) {
        console.warn('getSession called with empty sessionId');
        return null;
      }
      const response = await axios.get(`${this.baseUrl}/sessions/${sessionId}`);
      if (!response.data) {
        console.warn(`Session ${sessionId} returned no data`);
        return null;
      }
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Session ${sessionId} not found`);
      } else {
        console.error('Error getting session:', error.message);
      }
      return null;
    }
  }

  async getTaskFiles() {
    try {
      const files = fs.readdirSync(this.tasksDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          name: file,
          path: path.join(this.tasksDir, file),
          content: fs.readFileSync(path.join(this.tasksDir, file), 'utf8')
        }));
    } catch (error) {
      console.error('Error reading task files:', error.message);
      return [];
    }
  }

  async processTask(taskFile) {
    console.log(`Processing task: ${taskFile.name}`);
    
    // Extract the task description from the file
    const taskDescription = this.extractTaskDescription(taskFile.content);
    if (!taskDescription) {
      console.warn(`Could not extract task description from ${taskFile.name}`);
      this.recordProcessedTask(taskFile.name, 'failed', 'Could not extract task description');
      return false;
    }

    let success = false;
    let failureReason = null;
    let session = null;
    let nextResult = null;
    let abortDueToServer = false;
    let lastAsyncResult = null;

    try {
      session = await this.createSession(taskDescription);
      if (!session) {
        console.error(`Failed to create session for task ${taskFile.name}`);
        failureReason = 'Session creation failed';
        return false;
      }

      this.state.sessionId = session.id;
      this.state.currentTask = taskFile.name;
      this.state.status = 'processing';
      this.saveState();
      this.logHardBit({ phase: 'session-start', detail: 'session created with task' });
      await this.logAgentExecution(session.id, 'after-session-create');

      // Session was created with task in context
      // Server may need explicit routing input; try with task field first
      nextResult = await this.sendNext(session.id, { task: taskDescription });
      if (!nextResult || nextResult.error) {
        // Fallback: send as message in result payload
        console.log('Initial task send failed, retrying with result.message');
        nextResult = await this.sendNext(session.id, { result: { message: taskDescription } });
      }
      if (!nextResult) {
        console.error(`Failed to send initial next for task ${taskFile.name}`);
        failureReason = 'Initial next failed';
        return false;
      }
      this.logHardBit({
        phase: 'initial-next',
        detail: `sent task input (message/task)`,
        serverBusy: true
      });
      await this.logAgentExecution(session.id, 'after-initial-next');

      // Poll for completion
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      let attempts = 0;
      
      while (attempts < maxAttempts) {
      const asyncResult = await this.pollAsync(session.id);
      lastAsyncResult = asyncResult;
        if (!asyncResult) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        // Check asyncPending to determine if still waiting for LLM
        const isAsyncPending = asyncResult.asyncPending === true || asyncResult.status === 'processing';
        const isCompleted = asyncResult.completed === true || asyncResult.status === 'completed';
        const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;
        await this.describeAsyncResult(asyncResult, isAsyncPending);

        // If still processing (asyncPending is true), wait more
        if (isAsyncPending) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // If we have an active promise but task not yet completed, continue polling
        if (hasPromiseId && !isCompleted) {
          console.log(`Waiting on promise ${hasPromiseId} to complete...`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // If completed, get the session state to check for any form/choices
        if (isCompleted) {
          const sessionData = await this.getSession(session.id);
          const validation = this.validateSessionResponse(sessionData);
          if (!validation.valid) {
            console.warn(`Session response validation failed: ${validation.error}`);
            // Continue processing, but log
          }

          // Check if there's a form with choices that needs user input
          const form = sessionData?.context?.execution?.form || sessionData?.execute?.form;
          if (form && form.choices && form.choices.length > 0) {
            const choiceId = form.choices[0].id;
            nextResult = await this.sendNext(session.id, { result: { choice: choiceId } });
            if (!nextResult) {
              console.error(`Failed to send choice for task ${taskFile.name}`);
              failureReason = 'Router choice failed';
              return false;
            }
            this.logHardBit({
              phase: 'router-choice',
              detail: `auto-picked ${choiceId}`,
              serverBusy: true
            });
            await this.logAgentExecution(session.id, 'after-router-choice');
            // Poll again after sending choice
            continue;
          }

          // Check if we have a result
          const result = sessionData?.context?.result || sessionData?.result;
          if (result) {
            console.log(`Task ${taskFile.name} completed with result:`, result);
            
            await this.markTaskAsCompleted(taskFile.name);
            success = true;
            return true;
          }
        }

        // Unknown state, wait a bit
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      let timeoutStageInfo = null;
      if (session) {
        timeoutStageInfo = await this.describeTaskStage(session.id, lastAsyncResult);
      }
      const stageSummary = timeoutStageInfo ? ` stage=${timeoutStageInfo.stage}` : '';
      const detailSummary = timeoutStageInfo ? ` detail=${timeoutStageInfo.detail}` : '';
      console.error(
        `Task ${taskFile.name} timed out after ${maxAttempts * 5} seconds${stageSummary}${detailSummary}`
      );
      failureReason = `Timed out after ${maxAttempts * 5} seconds${timeoutStageInfo ? ` (${timeoutStageInfo.stage})` : ''}`;
      return false;
    } catch (error) {
      if (error instanceof ServerUnavailableError) {
        abortDueToServer = true;
        this.state.status = 'server-unavailable';
        this.saveState();
        throw error;
      }
      console.error(`Unexpected error processing ${taskFile.name}:`, error.message);
      failureReason = error.message || 'Unexpected error';
      return false;
    } finally {
      if (!abortDueToServer) {
        this.recordProcessedTask(taskFile.name, success ? 'completed' : 'failed', success ? null : failureReason);
        this.state.status = 'idle';
      }
      this.state.sessionId = null;
      this.state.currentTask = null;
      this.saveState();
    }
  }

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

  logHardBit({ phase, serverBusy = false, llmBusy = false, detail = '' }) {
    // Only update state if explicitly set (avoid overwriting with false)
    if (serverBusy !== false || llmBusy !== false) {
      this.hardbitState.server = serverBusy;
      this.hardbitState.llm = llmBusy;
    }
    this.hardbitState.client = Boolean(this.state.sessionId);
    const bits = [
      this.hardbitState.server ? 'S' : '-',
      this.hardbitState.llm ? 'L' : '-',
      this.hardbitState.client ? 'C' : '-',
    ].join('');
    const meta = detail ? ' ' + detail : '';
    console.log(`[hardbit:${bits}] phase=${phase}${meta}`);
  }

  async inspectPromise(promiseId) {
    if (!promiseId) return null;
    try {
      const [statusRes, resultRes] = await Promise.allSettled([
        axios.get(`${this.serverBaseUrl}/requests/${promiseId}`),
        axios.get(`${this.serverBaseUrl}/requests/${promiseId}/result`),
      ]);
      const statusData = statusRes.status === 'fulfilled' ? statusRes.value.data : null;
      const resultData = resultRes.status === 'fulfilled' ? resultRes.value.data : null;
      return {
        status: statusData?.status || resultData?.status || 'unknown',
        action: statusData?.context?.execution?.action || resultData?.context?.execution?.action,
      };
    } catch (error) {
      console.error(`[promise ${promiseId}] inspection failed:`, error.message);
      return null;
    }
  }

  async markTaskAsCompleted(taskName) {
    const taskFilePath = path.join(this.tasksDir, taskName);
    try {
      let content = fs.readFileSync(taskFilePath, 'utf8');

      // Add completion marker if not already present
      if (!content.includes('## Completion')) {
        content += '\n\n## Completion\n\n[X] Completed\n';
        fs.writeFileSync(taskFilePath, content);
        console.log(`Marked task ${taskName} as completed`);
      } else {
        // Update existing completion marker
        content = content.replace(/## Completion[\s\S]*?(?=##|$)/, '## Completion\n\n[X] Completed\n');
        fs.writeFileSync(taskFilePath, content);
        console.log(`Updated completion status for task ${taskName}`);
      }
    } catch (error) {
      console.error(`Error marking task ${taskName} as completed:`, error.message);
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
    const hookDoc = {
      hookId,
      type: 'task_monitor_issue',
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
      createdAt: new Date().toISOString()
    };

    try {
      fs.mkdirSync(this.hooksDir, { recursive: true });
      const hookPath = path.join(this.hooksDir, `${hookId}.json`);
      fs.writeFileSync(hookPath, JSON.stringify(hookDoc, null, 2));
      console.log(`Created/overwritten hook document: ${hookPath}`);
      return hookDoc;
    } catch (error) {
      console.error(`Failed to create hook document: ${error.message}`);
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

  async getCurrentPromiseId(sessionId) {
    try {
      const sessionData = await this.getSession(sessionId);
      return sessionData?.context?.result?.promiseId ||
             sessionData?.execute?.promiseId ||
             sessionData?.result?.promiseId || null;
    } catch (error) {
      console.error(`Error getting promise ID for session ${sessionId}:`, error.message);
      return null;
    }
  }

  async processNewTasks() {
    const taskFiles = await this.getTaskFiles();
    if (taskFiles.length === 0) {
      return;
    }

    // Only start new tasks if no active tasks are running
    if (this.activeTasks.size > 0) {
      return;
    }

    // Start only the first available task to avoid flooding
    for (const taskFile of taskFiles) {
      // Skip if already active or completed
      if (this.activeTasks.has(taskFile.name) ||
          taskFile.content.includes('[X] Completed') ||
          taskFile.content.includes('## Completion') && taskFile.content.includes('Completed')) {
        continue;
      }



      try {
        // Start processing this task
        const taskDescription = this.extractTaskDescription(taskFile.content);
        if (!taskDescription) {
          console.warn(`Could not extract task description from ${taskFile.name}`);
          continue;
        }

        const session = await this.createSession(taskDescription);
        if (!session) {
          console.error(`Failed to create session for task ${taskFile.name}`);
          await this.createHookDocument(null, taskFile.name, 'failed', 'Session creation failed');
          continue;
        }

        // Add to active tasks
        this.activeTasks.set(taskFile.name, {
          sessionId: session.id,
          taskName: taskFile.name,
          startedAt: new Date().toISOString(),
          lastPolled: new Date().toISOString(),
          status: 'processing'
        });

        this.state.currentTask = taskFile.name;
        this.state.sessionId = session.id;
        this.state.status = 'processing';
        this.saveState();

        console.log(`Started monitoring task: ${taskFile.name} (session: ${session.id})`);

        // Stop after starting one task to avoid flooding
        return;

      } catch (error) {
        console.error(`Error starting task ${taskFile.name}:`, error.message);
        await this.createHookDocument(null, taskFile.name, 'failed', error.message);
      }
    }
  }

  async monitorActiveTasks() {
    const activeSessions = Array.from(this.activeTasks.keys());

    for (const taskName of activeSessions) {
      try {
        const taskMeta = this.activeTasks.get(taskName);
        const sessionId = taskMeta.sessionId;

        const asyncResult = await this.pollAsync(sessionId);
        if (!asyncResult) continue;

        taskMeta.lastPolled = new Date().toISOString();
        const isCompleted = this.checkTaskCompletion(asyncResult);
        const isTimeout = this.isTaskTimeout(taskMeta);

        if (isCompleted) {
          await this.handleTaskCompletion(taskName, taskMeta, asyncResult);
        } else if (isTimeout) {
          await this.handleTaskTimeout(taskName, taskMeta, asyncResult);
        }
      } catch (error) {
        console.error(`Error monitoring task ${taskName}:`, error.message);
      }
    }
  }

  checkTaskCompletion(asyncResult) {
    const isAsyncPending = asyncResult.asyncPending === true || asyncResult.status === 'processing';
    const isCompleted = asyncResult.completed === true || asyncResult.status === 'completed';
    const hasPromiseId = asyncResult.result?.promiseId || asyncResult.execute?.promiseId;

    // Task is completed if not pending and not waiting on promise
    return !isAsyncPending && (!hasPromiseId || isCompleted);
  }

  isTaskTimeout(taskMeta) {
    const now = new Date();
    const startedAt = new Date(taskMeta.startedAt);
    const elapsedMinutes = (now - startedAt) / (1000 * 60);
    return elapsedMinutes > 5; // 5 minute timeout
  }

  async handleTaskCompletion(taskName, taskMeta, asyncResult) {
    const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
    console.log(`Task ${taskName} completed (stage=${stageInfo.stage})`);

    // Get final session state to check for results
    const sessionData = await this.getSession(taskMeta.sessionId);
    const result = sessionData?.context?.result || sessionData?.result;

    if (result) {
      console.log(`Task ${taskName} completed with result:`, result);

      await this.markTaskAsCompleted(taskName);
      await this.createCompletionReport(taskMeta.sessionId, taskName, result);
    } else {
      console.warn(
        `Task ${taskName} completed but no result found (stage=${stageInfo.stage} detail=${stageInfo.detail})`
      );
      await this.createHookDocument(
        taskMeta.sessionId,
        taskName,
        'failed',
        'No result in completed session',
        stageInfo
      );
    }

    // Remove from active tasks
    this.activeTasks.delete(taskName);
    this.saveState();
  }

  async handleTaskTimeout(taskName, taskMeta, asyncResult) {
    const stageInfo = await this.describeTaskStage(taskMeta.sessionId, asyncResult);
    console.error(
      `Task ${taskName} timed out after 5 minutes (stage=${stageInfo.stage} detail=${stageInfo.detail})`
    );

    await this.createHookDocument(
      taskMeta.sessionId,
      taskName,
      'timeout',
      'Task timed out after 5 minutes',
      stageInfo
    );

    // Remove from active tasks
    this.activeTasks.delete(taskName);
    this.saveState();
  }

  async cleanupCompletedTasks() {
    // Clean up any stale tasks (optional - activeTasks should be managed properly)
    const now = new Date();
    for (const [taskName, taskMeta] of this.activeTasks.entries()) {
      const lastPolled = new Date(taskMeta.lastPolled);
      const minutesSincePoll = (now - lastPolled) / (1000 * 60);

      // Remove tasks that haven't been polled in 10 minutes (indicates an error)
      if (minutesSincePoll > 10) {
        console.warn(`Removing stale task ${taskName} from active monitoring`);
        this.activeTasks.delete(taskName);
      }
    }
  }

  async run() {
    console.log('Starting task monitor in sequential mode...');

    this.resetStateForFreshRun();

    // Run initial health check
    const initialHealth = await this.healthCheck();
    if (!initialHealth.allOk) {
      console.error('Initial health check failed:', initialHealth.details);
      this.state.status = 'health-check-failed';
      this.saveState();
      return;
    }
    console.log('Initial health check passed');

    // Verify we can connect to the system
    const projects = await this.getProjects();
    if (projects.length === 0) {
      console.error('Could not connect to a2a system. Make sure it\'s running.');
      return;
    }

    console.log(`Connected to projects: ${projects.map(p => p.name).join(', ')}`);

    // Get task files
    const taskFiles = await this.getTaskFiles();
    if (taskFiles.length === 0) {
      console.error('No task files found in prompts-to-agent-mode directory');
      return;
    }

    console.log(`Found ${taskFiles.length} task files`);
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;

    // Process each task that hasn't been completed
    let encounteredServerUnavailable = false;
    for (const taskFile of taskFiles) {
      // Check if task is already marked as completed
      if (taskFile.content.includes('[X] Completed') ||
          taskFile.content.includes('## Completion') &&
          taskFile.content.includes('Completed')) {
        console.log(`Skipping already completed task: ${taskFile.name}`);
        skipCount++;
        continue;
      }

      // Process the task
      let success = false;
      try {
        success = await this.processTask(taskFile);
      } catch (error) {
        if (error instanceof ServerUnavailableError) {
          console.error('A2A server unavailable; pausing task processing.');
          encounteredServerUnavailable = true;
          break;
        }
        console.log(`Failed to process task: ${taskFile.name}`);
        failureCount++;
        continue;
      }
      if (success) {
        console.log(`Successfully processed task: ${taskFile.name}`);
        successCount++;
      } else {
        console.log(`Failed to process task: ${taskFile.name}`);
        failureCount++;
        // Continue with other tasks even if one fails
      }

      // Save state between tasks
      this.saveState();
    }

    // Run final health check
    const finalHealth = await this.healthCheck();
    if (!finalHealth.allOk) {
      console.error('Final health check failed:', finalHealth.details);
      this.state.status = 'final-health-check-failed';
    } else {
      console.log('Final health check passed');
    }

    // Validate final report state
    const reportValidation = this.validateReportState();
    if (!reportValidation.hasData) {
      console.warn('Report file has no data after processing');
      this.state.status = 'no-report-data';
    } else {
      console.log('Report file validation passed');
    }

    console.log(`Task processing complete (${successCount} succeeded, ${failureCount} failed, ${skipCount} skipped).`);
    if (encounteredServerUnavailable) {
      this.state.status = 'server-unavailable';
    } else if (taskFiles.length === 0 || successCount === 0 && failureCount === 0) {
      this.state.status = 'idle';
    } else {
      this.state.status = failureCount > 0 ? 'error' : 'completed';
    }
    this.state.currentTask = null;
    this.state.sessionId = null;
    this.saveState();
  }

  async runDaemon() {
    console.log('Starting daemon monitoring mode...');

    this.resetStateForFreshRun();

    // Run initial health check
    const initialHealth = await this.healthCheck();
    if (!initialHealth.allOk) {
      console.error('Initial health check failed:', initialHealth.details);
      this.state.status = 'health-check-failed';
      this.saveState();
      return;
    }
    console.log('Initial health check passed');

    // Verify we can connect to the system
    const projects = await this.getProjects();
    if (projects.length === 0) {
      console.error('Could not connect to a2a system. Make sure it\'s running.');
      return;
    }

    console.log(`Connected to projects: ${projects.map(p => p.name).join(', ')}`);
    console.log('Daemon monitor is running. Press Ctrl+C to stop.\n');

    // Setup graceful shutdown
    const shutdownHandler = async () => {
      console.log('\n\nShutting down daemon monitor gracefully...');
      await this.gracefulShutdown();
      process.exit(0);
    };
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);

    let cycleCount = 0;
    // Start monitoring loop
    while (true) {
      cycleCount++;
      if (cycleCount % 30 === 0) {
        // Log status every 30 seconds (30 cycles of 1 second each)
        const activeCount = this.activeTasks.size;
        const completedCount = this.state.processedTasks.filter(t => t.status === 'completed').length;
        const failedCount = this.state.processedTasks.filter(t => t.status === 'failed').length;
        console.log(`\n[daemon status] Active: ${activeCount} | Completed: ${completedCount} | Failed: ${failedCount}`);
      }

      await this.processNewTasks();
      await this.monitorActiveTasks();
      await this.cleanupCompletedTasks();

      // Brief pause before next cycle
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async gracefulShutdown() {
    console.log('Saving state and waiting for active tasks...');
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    let lastCheck = 0;

    while (this.activeTasks.size > 0 && Date.now() - startTime < maxWaitTime) {
      const elapsed = Date.now() - startTime;
      if (elapsed - lastCheck > 5000) {
        // Log every 5 seconds
        console.log(`  Waiting... ${this.activeTasks.size} tasks still active (${Math.floor(elapsed / 1000)}s elapsed)`);
        lastCheck = elapsed;
      }
      
      await this.monitorActiveTasks();
      await this.cleanupCompletedTasks();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (this.activeTasks.size > 0) {
      console.warn(`\n  Force shutdown with ${this.activeTasks.size} tasks still active`);
    }

    // Final state save
    this.state.status = 'daemon-shutdown';
    this.state.lastChecked = new Date().toISOString();
    this.saveState();

    // Print final summary
    const completedCount = this.state.processedTasks.filter(t => t.status === 'completed').length;
    const failedCount = this.state.processedTasks.filter(t => t.status === 'failed').length;
    const totalCount = this.state.processedTasks.length;
    console.log('\nDaemon monitor shutdown complete');
    console.log(`Final stats: ${totalCount} tasks processed (${completedCount} completed, ${failedCount} failed)`);
  }

  async healthCheck() {
    const results = {
      clientApi: false,
      a2aServer: false,
      ollama: false,
      aiHub: false,
      allOk: false,
      details: {}
    };

    try {
      // Check Client API
      const clientRes = await axios.get(`${this.baseUrl}/projects`, { timeout: 5000 });
      results.clientApi = clientRes.status === 200 && Array.isArray(clientRes.data.projects);
      results.details.clientApi = results.clientApi ? 'OK' : 'Failed';
    } catch (error) {
      results.details.clientApi = `Error: ${error.message}`;
    }

    try {
      // Check A2A Server
      const serverRes = await axios.get(`${this.serverBaseUrl}/health`, { timeout: 5000 });
      results.a2aServer = serverRes.status === 200;
      results.details.a2aServer = results.a2aServer ? 'OK' : 'Failed';
    } catch (error) {
      results.details.a2aServer = `Error: ${error.message}`;
    }

    try {
      // Check Ollama
      const ollamaRes = await axios.get('http://localhost:11435/api/tags', { timeout: 5000 });
      results.ollama = ollamaRes.status === 200 && Array.isArray(ollamaRes.data.models);
      results.details.ollama = results.ollama ? 'OK' : 'Failed';
    } catch (error) {
      results.details.ollama = `Error: ${error.message}`;
    }

    try {
      // Check AI Hub
      const aiHubRes = await axios.get('http://localhost:11434/health', { timeout: 5000 });
      results.aiHub = aiHubRes.status === 200;
      results.details.aiHub = results.aiHub ? 'OK' : 'Failed';
    } catch (error) {
      results.details.aiHub = `Error: ${error.message}`;
    }

    results.allOk = results.clientApi && results.a2aServer && results.ollama && results.aiHub;

    return results;
  }

  validateActionKeyShape(obj, type) {
    if (!obj || typeof obj !== 'object') return false;
    const keys = Object.keys(obj);
    return keys.length === 1 && (type === 'execute' ? keys[0] !== 'result' : keys[0] !== 'execute');
  }

  validateSessionResponse(response) {
    if (!response) return { valid: false, error: 'No response' };
    if (response.execute && !this.validateActionKeyShape(response.execute, 'execute')) {
      return { valid: false, error: 'Invalid execute action-key shape' };
    }
    if (response.result && !this.validateActionKeyShape(response.result, 'result')) {
      return { valid: false, error: 'Invalid result action-key shape' };
    }
    return { valid: true };
  }

  validateReportState() {
    const hasProcessedTasks = this.state.processedTasks && this.state.processedTasks.length > 0;
    const hasRecentActivity = this.state.lastChecked;
    return { hasData: hasProcessedTasks, recent: !!hasRecentActivity };
  }

  isServerUnavailableError(error) {
    return (
      error &&
      error.response &&
      error.response.status === 503 &&
      typeof error.response.data?.error === 'string' &&
      error.response.data.error.toLowerCase().includes('a2a server unavailable')
    );
  }
}

// Run the monitor
(async () => {
  const monitor = new TaskMonitor();

  // Check for sequential/once flag
  const isSequential = process.argv.includes('--sequential') || process.argv.includes('--once');

  if (isSequential) {
    await monitor.run();
  } else {
    await monitor.runDaemon();
  }
})().catch(console.error);
