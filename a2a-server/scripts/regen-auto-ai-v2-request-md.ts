/**
 * Regenerate simulations/auto-ai-v2 step folders' request.md from request.json
 * (LLM prep: materialize + flow hint + prompts/auto-ai-request.md).
 *
 * Picks every step subfolder that has both request.json and server-transforms-request.json.
 */
import {readFileSync, writeFileSync, readdirSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareInvokePayloadForLlmPrompt} from '../src/transform/materialize-result-for-llm.js';
import {attachFlowControlHintToInvokePayload} from '../src/prompts/flow-control-hints.js';
import {attachWorkbenchForLlmPrompt} from '../src/transform/workbench-normalize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const simBase = join(repoRoot, 'simulations', 'auto-ai-v2');
const tplPath = join(repoRoot, 'a2a-server', 'prompts', 'auto-ai-request.md');
const tpl = readFileSync(tplPath, 'utf8');

function stringifyForSlot(value: unknown): string {
    if (value === undefined) return 'null';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value, null, 2);
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
    const regex = new RegExp('\\${([^}]+)}', 'g');
    return template.replace(regex, (_, key: string) => {
        const k = key.trim();
        return stringifyForSlot(data[k]);
    });
}

const entries = readdirSync(simBase, {withFileTypes: true})
    .filter((e) => e.isDirectory())
    .map((e) => join(simBase, e.name))
    .filter((stepDir) => existsSync(join(stepDir, 'request.json')) && existsSync(join(stepDir, 'server-transforms-request.json')));

for (const stepDir of entries.sort()) {
    const reqPath = join(stepDir, 'request.json');
    const input = JSON.parse(readFileSync(reqPath, 'utf8')) as Record<string, unknown>;
    const clone = prepareInvokePayloadForLlmPrompt(JSON.parse(JSON.stringify(input)) as Record<string, unknown>);
    attachFlowControlHintToInvokePayload(clone);
    attachWorkbenchForLlmPrompt(clone);
    const ctx = clone.context;
    const md = renderTemplate(tpl, {
        flowControlHint: clone.flowControlHint,
        context: ctx,
        workbench: clone.workbench ?? null,
        ragResults: clone.ragResults ?? null,
    });
    writeFileSync(join(stepDir, 'request.md'), md, 'utf8');
    console.log('wrote', stepDir);
}
