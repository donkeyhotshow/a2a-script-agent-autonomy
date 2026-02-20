#!/usr/bin/env tsx
/**
 * Neurons CLI: list | validate | test [file] | doc
 * Usage: npx tsx scripts/neurons-cli.ts list
 *        npx tsx scripts/neurons-cli.ts validate
 *        npx tsx scripts/neurons-cli.ts test path/to/file.php
 *        npx tsx scripts/neurons-cli.ts doc
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { registerBaseNeurons } from '../src/knowledge/neurons/base/index.js';
import { getAllNeurons, getNeuron } from '../src/knowledge/neurons/neuron-store.js';
import { hasContextBlock } from '../src/knowledge/context-store.js';
import { activateNeurons } from '../src/knowledge/neurons/neuron-activator.js';
import { resolveRequestFiles } from '../src/knowledge/context-injector.js';
import type { NeuronAction } from '../src/knowledge/neurons/neuron.types.js';

registerBaseNeurons();

const cmd = process.argv[2] ?? 'list';

function list(): void {
  const neurons = getAllNeurons();
  console.log(`Neurons: ${neurons.length}\n`);
  for (const n of neurons) {
    const actions = (n.actions ?? [])
      .map((a) => (a as NeuronAction).type)
      .join(', ');
    const deps = n.dependsOn?.length ? ` deps:[${n.dependsOn.join(',')}]` : '';
    const conflicts = n.conflictsWith?.length
      ? ` conflicts:[${n.conflictsWith.join(',')}]`
      : '';
    console.log(`  ${n.id} (${n.category}) triggers:${n.triggers.length} actions:[${actions}]${deps}${conflicts}`);
  }
}

function validate(): void {
  const neurons = getAllNeurons();
  const errors: string[] = [];
  const seenIds = new Set<string>();

  for (const n of neurons) {
    if (!n.id) errors.push(`Neuron missing id`);
    else if (seenIds.has(n.id)) errors.push(`Duplicate id: ${n.id}`);
    else seenIds.add(n.id);

    if (!Array.isArray(n.triggers) || n.triggers.length === 0) {
      errors.push(`${n.id}: triggers required`);
    }

    for (const a of n.actions ?? []) {
      const action = a as NeuronAction;
      if (action.type === 'inject') {
        const target = (action as { target: string }).target;
        if (!target || !hasContextBlock(target)) {
          errors.push(`${n.id}: inject target "${target ?? ''}" not in context-store`);
        }
      }
      if (action.type === 'request_files') {
        const items = (action as { items: unknown[] }).items;
        if (!Array.isArray(items)) {
          errors.push(`${n.id}: request_files items must be array`);
        }
      }
    }

    for (const depId of n.dependsOn ?? []) {
      if (!getNeuron(depId)) {
        errors.push(`${n.id}: dependsOn "${depId}" not found`);
      }
    }
    for (const cId of n.conflictsWith ?? []) {
      if (!getNeuron(cId)) {
        errors.push(`${n.id}: conflictsWith "${cId}" not found`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Validation failed:');
    errors.forEach((e) => console.error('  -', e));
    process.exit(1);
  }
  console.log(`OK: ${neurons.length} neurons validated`);
}

function test(): void {
  const filePath = process.argv[3];
  if (!filePath) {
    console.error('Usage: neurons-cli.ts test <file-path>');
    process.exit(1);
  }
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const content = readFileSync(filePath, 'utf-8');
  const activated = activateNeurons({
    filePaths: [filePath],
    fileContents: { [filePath]: content },
  });
  console.log(`File: ${filePath}\nActivated: ${activated.length}\n`);
  for (const { neuron, matchedTriggers } of activated) {
    const reqFiles = resolveRequestFiles([{ neuron, matchedTriggers }]);
    const reqStr = reqFiles.length ? ` request_files:[${reqFiles.join(', ')}]` : '';
    console.log(`  ${neuron.id} matched:[${matchedTriggers.join(', ')}]${reqStr}`);
  }
}

function doc(): void {
  const neurons = getAllNeurons();
  const lines: string[] = [
    '# Neurons Catalog',
    '',
    'Auto-generated. Run `npm run neurons:doc` to regenerate.',
    '',
    '| id | category | triggers | actions | priority |',
    '|----|----------|----------|---------|---------|',
  ];
  for (const n of neurons) {
    const actions = (n.actions ?? []).map((a) => (a as NeuronAction).type).join(', ');
    const priority = n.priority ?? 5;
    lines.push(`| ${n.id} | ${n.category} | ${n.triggers.length} | ${actions} | ${priority} |`);
  }
  lines.push('');
  lines.push('## Details');
  for (const n of neurons) {
    lines.push(`### ${n.id}`);
    lines.push(`- **Category:** ${n.category}`);
    lines.push(`- **Triggers:** ${n.triggers.join(', ')}`);
    lines.push(`- **Mode:** ${n.triggersMode ?? 'any'}`);
    lines.push(`- **Priority:** ${n.priority ?? 5}`);
    if (n.dependsOn?.length) lines.push(`- **Depends on:** ${n.dependsOn.join(', ')}`);
    if (n.conflictsWith?.length) lines.push(`- **Conflicts with:** ${n.conflictsWith.join(', ')}`);
    lines.push('');
  }
  const outPath = 'docs/neurons-catalog.md';
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n'));
  console.log(`Written ${outPath}`);
}

if (cmd === 'list') list();
else if (cmd === 'validate') validate();
else if (cmd === 'test') test();
else if (cmd === 'doc') doc();
else {
  console.error('Usage: neurons-cli.ts list | validate | test <file> | doc');
  process.exit(1);
}
