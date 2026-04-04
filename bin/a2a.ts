#!/usr/bin/env node
import { Command } from 'commander';
// @ts-ignore
import fetch from 'node-fetch';

const program = new Command();

async function ingestProject(dir: string) {
    return { dir }; // mock ingest
}

program
  .command('run <prompt>')
  .option('--dir <path>', './', 'Project directory')
  .option('--halt-on-fail', 'Stop on SafetyLayer intercept')
  .action(async (prompt: string, cmd: any) => {
    const context = await ingestProject(cmd.dir);
    const response = await fetch('http://localhost:3000/api/a2a/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context })
    });

    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        process.stdout.write(new TextDecoder().decode(value));
      }
    } else {
        console.log(await response.text());
    }
  });

program.parse();
