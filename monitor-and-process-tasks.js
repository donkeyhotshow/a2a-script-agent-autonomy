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
    this.serverBaseUrl = 'http://localhost:3000/api/v1';
    this.hardbitState = { server: false, llm: false, client: true };
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);
        console.log(`Loaded state: ${JSON.stringify(this.state)}`);
      } else {
        this.state = {
          lastChecked: null,
          processedTasks: [],
          currentTask: null,
          sessionId: null,
          status: 'idle'
        };
        this.saveState();
      }
    } catch (error) {
      console.error('Error loading state:', error);
      this.state = {
        lastChecked: null,
        processedTasks: [],
        currentTask: null,
        sessionId: null,
        status: 'error'
      };
    }
  }

  saveState() {
    try {
      this.state.lastChecked = new Date().toISOString();
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
      const response = await axios.get(`${this.baseUrl}/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting session:', error.message);
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

      // Session was created with task in context - send the task again to move state forward
      // (server expects result/message on /next after session creation with task)
      nextResult = await this.sendNext(session.id, { task: taskDescription });
      if (!nextResult) {
        // Try alternative with result.message
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

        // If we have a promiseId but no completed flag yet, we might still be processing
        if (hasPromiseId && !isCompleted) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // If completed, get the session state to check for any form/choices
        if (isCompleted) {
          const sessionData = await this.getSession(session.id);
          
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

      console.error(`Task ${taskFile.name} timed out after ${maxAttempts * 5} seconds`);
      failureReason = `Timed out after ${maxAttempts * 5} seconds`;
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
    
    // Fallback to first line
    return lines[0].trim();
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
    this.hardbitState.server = serverBusy;
    this.hardbitState.llm = llmBusy;
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

  async run() {
    console.log('Starting task monitor...');
    
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
  await monitor.run();
})().catch(console.error);
