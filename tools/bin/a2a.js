#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * A2A CLI Auto-Ingest (ADR-0073)
 * Usage: npx a2a "task description" [--dir .]
 */

const args = process.argv.slice(2);
const taskInput = args.find(a => !a.startsWith('--'));
const dirArg = args.find(a => a.startsWith('--dir='))?.split('=')[1] || '.';

if (!taskInput) {
  console.log('Usage: npx a2a "task description" [--dir .]');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), dirArg);

async function ingest() {
  console.log(`[A2A] Ingesting context from: ${targetDir}`);
  
  let gitStatus = '';
  try {
    gitStatus = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf-8' });
  } catch (e) {
    console.warn('[A2A] Git not found or not a repo, skipping status ingest.');
  }

  // Basic file discovery (ts, js, md)
  const files = [];
  const walk = (dir) => {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
          walk(fullPath);
        }
      } else if (file.match(/\.(ts|js|md|json)$/)) {
        files.push(path.relative(targetDir, fullPath));
      }
    });
  };
  walk(targetDir);

  const context = {
    projectId: path.basename(targetDir),
    projectRoot: targetDir,
    gitStatus,
    files: files.slice(0, 50), // Cap for initial context
    cli_ingest: true
  };

  try {
    const clientApiUrl = process.env.A2A_CLIENT_API_URL || 'http://localhost:5173/api/a2a';
    console.log(`[A2A] Creating session on ${clientApiUrl}...`);
    
    const sessRes = await fetch(`${clientApiUrl}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: taskInput,
        projectId: context.projectId,
        projectRoot: context.projectRoot,
        mode: 'agent'
      })
    });

    const sessData = await sessRes.json();
    if (sessData.success) {
      const sessionId = sessData.session.id;
      console.log(`[A2A] Session created: ${sessionId}`);
      console.log(`[A2A] View progress: http://localhost:5173/sessions/${sessionId}`);
      
      // Start execution
      await fetch(`${clientApiUrl}/sessions/${sessionId}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput })
      });
      
      console.log('[A2A] Task started successfully.');
    } else {
      console.error('[A2A] Failed to create session:', sessData.error);
    }
  } catch (e) {
    console.error('[A2A] Failed to connect to Client API. Is the stack running?', e.message);
  }
}

ingest();
