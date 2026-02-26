/**
 * A2A Client API Server
 * 
 * Exposes client-side tools (terminal, fs-utils, etc.) via REST API
 * This runs on the client machine to provide local file system and terminal access
 */

import express from 'express';
import cors from 'cors';
import { scanFiles } from '@a2a/fs-utils';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== TERMINAL API ====================

// Execute terminal command
app.post('/api/terminal/execute', async (req, res) => {
  try {
    const { command, timeout = 120, cwd } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    // Security: block dangerous commands
    const cmdLower = command.toLowerCase().trim();
    const dangerousPatterns = ['rm -rf /', 'format', 'del /f /s /q', 'rmdir /s /q', 'shutdown', 'taskkill /f'];
    
    for (const pattern of dangerousPatterns) {
      if (cmdLower.includes(pattern)) {
        return res.status(403).json({ error: `Command blocked: potentially dangerous pattern: ${pattern}` });
      }
    }

    // Set working directory
    const workDir = cwd || process.cwd();
    
    // Execute command with timeout
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';
    let exitCode = 0;
    
    try {
      // Use PowerShell on Windows for better command handling
      const { stdout, stderr } = await execAsync(command, { 
        cwd: workDir,
        timeout: timeout * 1000,
        shell: true,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      output = stdout || '';
      errorOutput = stderr || '';
    } catch (execError: any) {
      exitCode = execError.code || 1;
      errorOutput = execError.message || '';
    }

    const duration = Date.now() - startTime;
    
    let response = `OK (dur=${duration}, code=${exitCode})`;
    if (output) response += `\n${output}`;
    if (errorOutput) response += `\n${errorOutput}`;
    
    res.json({ output: response, exitCode, duration });
  } catch (error: any) {
    console.error('Terminal execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Terminal structured actions (workspace, history, session)
app.post('/api/terminal/action', async (req, res) => {
  try {
    const { action, subAction, path: actionPath } = req.body;
    
    let output = '';
    
    switch (action) {
      case 'workspace':
        if (subAction === 'get') {
          output = `🏠 Current workspace: ${process.cwd()}`;
        } else if (subAction === 'set') {
          // Check if directory exists
          try {
            const stats = await fs.stat(actionPath);
            if (!stats.isDirectory()) {
              return res.status(400).json({ error: 'Path is not a directory' });
            }
            output = `✅ Workspace set to: ${actionPath}`;
          } catch {
            return res.status(400).json({ error: `Directory does not exist: ${actionPath}` });
          }
        }
        break;
      case 'pwd':
        output = `📁 Current directory: ${process.cwd()}`;
        break;
      case 'session':
        if (subAction === 'info') {
          output = JSON.stringify({
            cwd: process.cwd(),
            platform: process.platform,
            pid: process.pid
          }, null, 2);
        } else if (subAction === 'reset') {
          output = 'Session state reset';
        }
        break;
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    
    res.json({ output });
  } catch (error: any) {
    console.error('Terminal action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== FILE SYSTEM API ====================

// Scan directory for files
app.post('/api/fs/scan', async (req, res) => {
  try {
    const { dir, options = {} } = req.body;
    
    if (!dir) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const result = await scanFiles(dir, options);
    res.json(result);
  } catch (error: any) {
    console.error('File scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read file
app.post('/api/fs/read', async (req, res) => {
  try {
    const { filePath, encoding = 'utf-8' } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const content = await fs.readFile(filePath, encoding as BufferEncoding);
    res.json({ content });
  } catch (error: any) {
    console.error('File read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Write file
app.post('/api/fs/write', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'File path and content are required' });
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (error: any) {
    console.error('File write error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List directory
app.post('/api/fs/list', async (req, res) => {
  try {
    const { dirPath } = req.body;
    
    if (!dirPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(dirPath, entry.name)
    }));
    
    res.json({ entries: result });
  } catch (error: any) {
    console.error('Directory list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if path exists
app.post('/api/fs/exists', async (req, res) => {
  try {
    const { path: checkPath } = req.body;
    
    if (!checkPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    try {
      const stats = await fs.stat(checkPath);
      res.json({ exists: true, isDirectory: stats.isDirectory(), isFile: stats.isFile() });
    } catch {
      res.json({ exists: false });
    }
  } catch (error: any) {
    console.error('Path check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current working directory
app.get('/api/fs/cwd', (req, res) => {
  res.json({ cwd: process.cwd() });
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'a2a-client-api', 
    timestamp: new Date().toISOString() 
  });
});

// ==================== START SERVER ====================

app.listen(PORT, HOST, () => {
  console.log(`A2A Client API Server started on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`Terminal: http://${HOST}:${PORT}/api/terminal/execute`);
  console.log(`File System: http://${HOST}:${PORT}/api/fs/*`);
});

export default app;
