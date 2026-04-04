#!/usr/bin/env tsx
import { Command } from 'commander';
import { llmService } from '../src/services/llm/llm-service.js';
import { ultraContextService } from '../src/services/context/ultracontext.service.js';
import { logger } from '../src/utils/logger.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const program = new Command();

program
  .name('a2a-claude')
  .description('Claude-style terminal coding loop for A2A')
  .option('-d, --dir <directory>', 'Target directory', process.cwd())
  .argument('<task>', 'The task to perform')
  .action(async (task, options) => {
    const dir = path.resolve(options.dir);
    console.log(`\n🚀 Starting A2A Claude Mode in ${dir}`);
    console.log(`🎯 Task: ${task}\n`);

    const sessionId = `claude_${Date.now()}`;
    ultraContextService.create(sessionId, { task, dir });

    await runClaudeLoop(sessionId, task, dir);
  });

async function runClaudeLoop(sessionId: string, task: string, dir: string) {
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    console.log(`\n--- Iteration ${iterations} ---`);

    // 1. Observe
    console.log('🔍 Observing environment...');
    const observation = observe(dir);
    ultraContextService.append(sessionId, { observation }, `Observation ${iterations}`);

    // 2. Plan
    console.log('🧠 Planning next moves...');
    const context = ultraContextService.getLatest(sessionId);
    const planResponse = await llmService.chat({
      messages: [
        { role: 'system', content: 'You are an elite coding agent. Based on the observation, create a plan to fulfill the task. Output only the plan.' },
        { role: 'user', content: `Task: ${task}\nObservation: ${JSON.stringify(observation, null, 2)}` }
      ]
    });
    console.log(`📝 Plan: ${planResponse.content}`);
    ultraContextService.append(sessionId, { plan: planResponse.content }, `Plan ${iterations}`);

    // 3. Act (Simulated for this POC)
    console.log('⚡ Acting on the plan...');
    // In a real implementation, we'd parse the plan for file operations
    // and apply them via fs or tool calls.
    console.log('✅ Changes applied (POC: simulation only)');

    // 4. Reflect
    console.log('🔄 Reflecting on results...');
    const reflection = reflect(dir);
    if (reflection.done) {
      console.log('\n✨ Task completed successfully!');
      break;
    }

    // 5. Safety check
    if (!safetyCheck(reflection)) {
       console.error('🛑 Safety violation detected. Halting.');
       break;
    }
  }

  if (iterations >= maxIterations) {
    console.warn('\n⚠️ Max iterations reached without completion.');
  }
}

function observe(dir: string) {
  try {
    const gitStatus = execSync('git status --short', { cwd: dir }).toString();
    const files = fs.readdirSync(dir).slice(0, 5); // Just a few files
    return { gitStatus, files };
  } catch (e) {
    return { error: 'Failed to observe directory' };
  }
}

function reflect(dir: string) {
  // Simple check for POC: if no git changes, assume done (fake logic)
  return { done: false, errors: [] };
}

function safetyCheck(reflection: any) {
  return true; // Simple pass for POC
}

program.parse();
