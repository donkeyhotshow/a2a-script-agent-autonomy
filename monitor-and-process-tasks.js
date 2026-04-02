import axios from 'axios';
import fs from 'fs';
import path from 'path';

class TaskMonitor {
  constructor() {
    this.baseUrl = 'http://localhost:5173/api/a2a';
    this.projectId = 'p_1771576028988'; // From projects endpoint
    this.stateFile = path.join(process.cwd(), 'task-monitor-state.json');
    this.tasksDir = path.join(process.cwd(), 'prompts-to-agent-mode');
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
      return false;
    }

    // Create session
    const session = await this.createSession(taskDescription);
    if (!session) {
      console.error(`Failed to create session for task ${taskFile.name}`);
      return false;
    }

    this.state.sessionId = session.id;
    this.state.currentTask = taskFile.name;
    this.state.status = 'processing';
    this.saveState();

    // Send the task as result.message (since the session creation returns a form asking for task)
    let nextResult = await this.sendNext(session.id, { result: { message: taskDescription } });
    if (!nextResult) {
      // Try the shorthand task field as mentioned in AGENTS.md
      nextResult = await this.sendNext(session.id, { task: taskDescription });
    }
    if (!nextResult) {
      console.error(`Failed to send initial next for task ${taskFile.name}`);
      return false;
    }

    // Poll for completion
    let maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const asyncResult = await this.pollAsync(session.id);
      if (!asyncResult) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Check if we need to make a choice (router step)
      if (asyncResult.execute && asyncResult.execute.form && 
          asyncResult.execute.form.choices && 
          asyncResult.execute.form.choices.length > 0) {
        // For now, we'll just choose the first option (agent mode)
        // In a real implementation, we'd analyze the choices better
        const choiceId = asyncResult.execute.form.choices[0].id;
        nextResult = await this.sendNext(session.id, { task: choiceId });
        if (!nextResult) {
          console.error(`Failed to send choice for task ${taskFile.name}`);
          return false;
        }
        continue;
      }

      // Check if we have a result
      if (asyncResult.result) {
        console.log(`Task ${taskFile.name} completed with result:`, asyncResult.result);
        
        // Mark task as completed
        await this.markTaskAsCompleted(taskFile.name);
        
        // Clean up
        this.state.sessionId = null;
        this.state.currentTask = null;
        this.state.status = 'idle';
        this.saveState();
        
        return true;
      }

      // Check if still processing
      if (asyncResult.execute) {
        // Still processing, wait and check again
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Unknown state, wait a bit
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.error(`Task ${taskFile.name} timed out after ${maxAttempts * 5} seconds`);
    return false;
  }

  extractTaskDescription(content) {
    // Try to extract the task description from the markdown file
    // Look for common patterns
    
    // Look for a line that starts with "Agent prompt" or similar
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Agent prompt') || lines[i].includes('task:')) {
        // Return the next non-empty line or the rest of the content
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].trim() !== '') {
            return lines[j].trim();
          }
        }
      }
    }
    
    // If no specific pattern found, return first substantial line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
        return trimmed;
      }
    }
    
    // Fallback to first line
    return lines[0].trim();
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
    
    // Process each task that hasn't been completed
    for (const taskFile of taskFiles) {
      // Check if task is already marked as completed
      if (taskFile.content.includes('[X] Completed') || 
          taskFile.content.includes('## Completion') && 
          taskFile.content.includes('Completed')) {
        console.log(`Skipping already completed task: ${taskFile.name}`);
        continue;
      }
      
      // Process the task
      const success = await this.processTask(taskFile);
      if (success) {
        console.log(`Successfully processed task: ${taskFile.name}`);
      } else {
        console.log(`Failed to process task: ${taskFile.name}`);
        // Continue with other tasks even if one fails
      }
      
      // Save state between tasks
      this.saveState();
    }
    
    console.log('All tasks processed!');
    this.state.status = 'completed';
    this.saveState();
  }
}

// Run the monitor
const monitor = new TaskMonitor();
monitor.run().catch(console.error);