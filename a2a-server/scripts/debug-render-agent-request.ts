import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPromptsTransform, getPromptsTransformsPath } from '../src/transform/pipeline/prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const promptsTransformsDir = getPromptsTransformsPath();

  const input: Record<string, unknown> = {
    context: {
      session_id: 'stateless',
      task: 'List repo root files and summarize START-FULL-SPECTRUM.md in 3 bullets.',
      execution: { action: 'agent', step: 'new' },
      result: { message: 'List repo root files and summarize START-FULL-SPECTRUM.md in 3 bullets.' },
      history: [],
    },
    task: 'List repo root files and summarize START-FULL-SPECTRUM.md in 3 bullets.',
    result: { message: 'List repo root files and summarize START-FULL-SPECTRUM.md in 3 bullets.' },
  };

  const out = await runPromptsTransform(promptsTransformsDir, 'agent', input, 'request', {
    baseDir: path.resolve(__dirname, '..', '..'),
  });

  const req = out.files?.['request.md'];
  if (!req) {
    console.log(JSON.stringify(out.output, null, 2));
    throw new Error('request.md not rendered into out.files');
  }

  // eslint-disable-next-line no-console
  console.log(req);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

