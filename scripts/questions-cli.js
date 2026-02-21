#!/usr/bin/env node
/**
 * CLI: get questions from knowledge graph
 * Usage: node scripts/questions-cli.js [project_path]
 *        project_path from argv, or first project from .a2a-client/projects.json
 *
 * Requires: server running, A2A_TOKEN or SKIP_AUTH=1
 */

const BASE_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000/api/v1';
const TOKEN = process.env.A2A_TOKEN || 'a2a_dev_password';
const POLL_MS = 5000;
const MAX_POLLS = 24; // 2 min

async function req(url, opts = {}) {
  const fn = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
  const res = await fn(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function getProjectPath(argv) {
  const path = argv[2];
  if (path) return path;
  try {
    const fs = require('fs');
    const p = require('path');
    const candidates = [
      p.join(process.cwd(), 'a2a-client', '.a2a-client', 'projects.json'),
      p.join(process.cwd(), '.a2a-client', 'projects.json'),
    ];
    const file = candidates.find((f) => fs.existsSync(f));
    if (!file) throw new Error('projects.json not found');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const proj = data.projects?.[0];
    return proj?.path || process.cwd();
  } catch {
    return process.cwd();
  }
}

async function main() {
  const projectPath = getProjectPath(process.argv);
  console.error('project_path:', projectPath);
  console.error('POST', BASE_URL + '/requests');

  const create = await req(BASE_URL + '/requests', {
    method: 'POST',
    body: JSON.stringify({
      context: {
        version: '1.0',
        session_id: 'cli',
        project_path: projectPath,
        new_task: ['Get questions from graph'],
      },
    }),
  });

  if (!create.success || !create.data?.promiseId) {
    console.error(create);
    process.exit(1);
  }

  const promiseId = create.data.promiseId;
  console.error('promiseId:', promiseId);
  console.error('Polling...');

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const result = await req(BASE_URL + '/requests/' + promiseId + '/result');
    const d = result.data;
    if (d.status !== 'completed' && d.status !== 'failed') continue;

    if (d.status === 'failed') {
      console.error('Failed:', d.error);
      process.exit(1);
    }

    const res = d.result || {};
    const questions = res.questions || [];
    const question = res.question || '';

    if (questions.length) {
      questions.forEach((q, i) => {
        console.log(`[${q.type}] ${q.text}`);
        if (q.hint) console.log(`  hint: ${q.hint}`);
      });
    } else {
      console.log(question || 'No questions.');
    }
    return;
  }

  console.error('Timeout');
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
