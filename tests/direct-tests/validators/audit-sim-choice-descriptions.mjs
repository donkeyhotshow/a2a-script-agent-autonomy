#!/usr/bin/env node
/** Report simulation JSON objects in choices[] missing non-empty description (any depth). */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function walkJson(dir, out = []) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walkJson(p, out);
        else if (name.name.endsWith('.json')) out.push(p);
    }
    return out;
}

function audit(obj, file, hits) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
        for (const x of obj) audit(x, file, hits);
        return;
    }
    const ch = obj.choices;
    if (Array.isArray(ch)) {
        for (let i = 0; i < ch.length; i++) {
            const c = ch[i];
            if (c && typeof c === 'object' && ('id' in c || 'label' in c)) {
                const d = c.description;
                if (typeof d !== 'string' || !d.trim()) hits.push({ file, idx: i, id: c.id });
            }
        }
    }
    for (const k of Object.keys(obj)) audit(obj[k], file, hits);
}

const root = join(__dirname, '..', '..', '..', 'simulations');
const hits = [];
for (const f of walkJson(root)) {
    let j;
    try {
        j = JSON.parse(readFileSync(f, 'utf8'));
    } catch {
        continue;
    }
    audit(j, f, hits);
}
if (hits.length) {
    for (const h of hits) console.log(h.file, h.id, h.idx);
    console.error('missing descriptions:', hits.length);
    process.exit(1);
}
console.log('all choice rows have non-empty description');
