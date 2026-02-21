#!/usr/bin/env tsx
/**
 * Process MD protocol input → run core logic → write output to file.
 * No DB. Use: npx tsx scripts/process-input.ts [input.md] [output.md]
 * Default: docs/adr-hacks/archive/raw/etalon-D-request.md → output/etalon-D-result.md
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { processNewTaskToContext } from '../src/knowledge/context-handler.js';
import { resolveInjections, mergeInjectedContext } from '../src/knowledge/context-injector.js';
import { registerBaseNeurons } from '../src/knowledge/neurons/base/index.js';

registerBaseNeurons();
import { extractSemantics } from '../src/knowledge/semantic-extractor.js';
import { buildQuestions } from '../src/knowledge/question-builder.js';
import { queryIndex } from '../src/services/index-query.service.js';
// ============================================
// MD Protocol Parser (per a2a-client/docs/requirements.md)
// ============================================

function parseMdInput(text: string): { context: Record<string, unknown>; codeBlocks: Array<{ path: string; content: string }> } {
  const contextMatch = text.match(/```\s*context\s*[\r\n]+([\s\S]*?)```/);
  if (!contextMatch) throw new Error('Missing ```context block');
  let context: Record<string, unknown>;
  try {
    context = JSON.parse(contextMatch[1].trim()) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Invalid context JSON: ${e}`);
  }

  const codeBlocks: Array<{ path: string; content: string }> = [];
  const fileRegex = /```file:([^\r\n]+)[\r\n]+([\s\S]*?)```/g;
  let m;
  while ((m = fileRegex.exec(text)) !== null) {
    const sig = m[1];
    const content = m[2].trim();
    const rangeMatch = sig.match(/^(.+):(\d+)-(\d+)$/);
    const path = rangeMatch ? rangeMatch[1] : sig;
    codeBlocks.push({ path, content });
  }

  return { context, codeBlocks };
}

function serializeOutput(result: {
  outcome: string;
  context: Record<string, unknown>;
  activatedNeurons?: Array<{ neuron: { id: string; name: string }; matchedTriggers: string[] }>;
  questions?: string[];
  index_answers?: Array<{ question: string; filePath?: string; content?: string }>;
  message?: string;
}): string {
  const parts: string[] = [];

  parts.push('```context');
  parts.push(JSON.stringify(result.context, null, 2));
  parts.push('```');
  parts.push('');

  parts.push('---');
  parts.push(`**outcome:** ${result.outcome}`);
  if (result.message) parts.push(`**message:** ${result.message}`);
  if (result.activatedNeurons?.length) {
    parts.push('');
    parts.push('### Activated neurons');
    for (const an of result.activatedNeurons) {
      parts.push(`- ${an.neuron.name} (${an.matchedTriggers.join(', ')})`);
    }
  }
  if (result.context.request_files) {
    parts.push('');
    parts.push('### request_files');
    parts.push((result.context.request_files as string[]).join(', '));
  }
  parts.push('');

  if (result.questions?.length) {
    parts.push('### Questions (semantic → index)');
    for (const q of result.questions) {
      parts.push(`- ${q}`);
    }
  }

  if (result.index_answers?.length) {
    parts.push('');
    parts.push('### Index Answers (placeholder)');
    for (const a of result.index_answers) {
      parts.push(`- ${a.question}`);
    }
  }

  return parts.join('\n');
}

// ============================================
// Core Processing (mirrors request-processor, no graph)
// ============================================

async function processInput(context: Record<string, unknown>, codeBlocks: Array<{ path: string; content: string }>) {
  let workingContext = { ...context };
  const codeBlocksArr = codeBlocks;

  let activatedNeurons: Array<{ neuron: { id: string; name: string }; matchedTriggers: string[] }> = [];
  if (workingContext['new_task']) {
    const { context, activatedNeurons: an } = processNewTaskToContext(workingContext, codeBlocksArr);
    workingContext = context;
    activatedNeurons = an;
  }

  const tasks = (workingContext['tasks'] as Array<{ target?: string }>) ?? [];
  const taskTexts = tasks.map((t) => t.target).filter(Boolean) as string[];
  const chunks = extractSemantics(codeBlocksArr);
  const built = buildQuestions(chunks, taskTexts);
  const projectId = (workingContext['project_path'] as string) ?? 'default';
  const indexAnswers = await queryIndex(projectId, built);

  const injectedContent = mergeInjectedContext(resolveInjections(activatedNeurons));
  const contextBlock = { ...workingContext, outcome: 'completed' };
  // External AI: placeholder — too early to integrate
  const message = 'Request processed (placeholder for external AI)';

  return {
    outcome: 'completed',
    context: contextBlock,
    activatedNeurons,
    message,
    questions: built.map((q) => q.question),
    index_answers: indexAnswers,
  };
}

// ============================================
// CLI
// ============================================

// Run from a2a-server or repo root
const root = process.cwd().endsWith('a2a-server') ? join(process.cwd(), '..') : process.cwd();
const defaultInput = join(root, 'docs/adr-hacks/archive/raw/etalon-D-request.md');
const defaultOutput = join(root, 'output/etalon-D-result.md');

const inputPath = process.argv[2] || defaultInput;
const outputPath = process.argv[3] || defaultOutput;

(async () => {
  try {
    const input = readFileSync(inputPath, 'utf-8');
    const { context, codeBlocks } = parseMdInput(input);

    const result = await processInput(context, codeBlocks);

    const outDir = dirname(outputPath);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    writeFileSync(outputPath, serializeOutput(result), 'utf-8');

    console.log(`Input: ${inputPath}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Outcome: ${result.outcome}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
