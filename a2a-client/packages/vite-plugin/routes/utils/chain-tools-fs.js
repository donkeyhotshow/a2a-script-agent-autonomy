import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { resolveUnderProjectRoot } from '@a2a/execution/path-sandbox';

function escapeRegexLiteral(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function runClientReadFile(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    if (!p.trim()) {
        return { path: '', error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, error: 'path outside project' };
    }
    try {
        const stat = await fsp.stat(abs);
        if (!stat.isFile()) {
            return { path: p, error: 'not a file' };
        }
        let content = await fsp.readFile(abs, 'utf8');
        const sl = payload.startLine;
        const el = payload.endLine;
        if (typeof sl === 'number' && sl > 0) {
            const lines = content.split('\n');
            const end = typeof el === 'number' ? el : lines.length;
            content = lines.slice(sl - 1, end).join('\n');
        }
        return { path: p, content };
    } catch (e) {
        return { path: p, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function runClientListDirectory(projectPath, payload) {
    const raw = payload.path && typeof payload.path === 'string' ? payload.path : (typeof payload.dirPath === 'string' ? payload.dirPath : '');
    if (!raw.trim()) {
        return { path: '', entries: [], success: false, error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, raw);
    if (!abs) {
        return { path: raw, entries: [], success: false, error: 'path outside project' };
    }
    try {
        const stat = await fsp.stat(abs);
        if (!stat.isDirectory()) {
            return { path: raw, entries: [], success: false, error: 'not a directory' };
        }
        const dirents = await fsp.readdir(abs, { withFileTypes: true });
        const entries = dirents.map((d) => ({
            name: d.name,
            isFile: d.isFile(),
            isDirectory: d.isDirectory(),
        }));
        return { path: raw, entries, success: true };
    } catch (e) {
        return { path: raw, entries: [], success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function runClientFileExists(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    if (!p.trim()) {
        return { path: '', exists: false, success: false, error: 'missing path' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, exists: false, success: false, error: 'path outside project' };
    }
    const want = typeof payload.type === 'string' ? payload.type : 'any';
    try {
        const st = await fsp.stat(abs);
        const ok = want === 'any' || (want === 'file' && st.isFile()) || (want === 'directory' && st.isDirectory());
        return { path: p, exists: ok, success: true };
    } catch {
        return { path: p, exists: false, success: true };
    }
}

export async function runClientWriteFile(projectPath, payload) {
    const p = typeof payload.path === 'string' ? payload.path : '';
    const content = payload.content;
    if (!p.trim() || content === undefined) {
        return { path: p || '', success: false, error: 'missing path or content' };
    }
    const abs = resolveUnderProjectRoot(projectPath, p);
    if (!abs) {
        return { path: p, success: false, error: 'path outside project' };
    }
    try {
        await fsp.mkdir(path.dirname(abs), { recursive: true });
        await fsp.writeFile(abs, String(content), 'utf8');
        return { path: p, success: true };
    } catch (e) {
        return { path: p, success: false, error: e instanceof Error ? e.message : String(e) };
    }
}

export async function runClientGrepSearch(projectPath, payload) {
    const pattern = typeof payload.pattern === 'string' ? payload.pattern : '';
    if (!pattern.trim()) {
        return { pattern: '', matches: [], success: false, error: 'missing pattern' };
    }
     const opts = payload.options && typeof payload.options === 'object' ? payload.options : {};
     const useRegex = opts.regex === true;
     const maxResults = Math.min(typeof opts.maxResults === 'number' ? opts.maxResults : 500, 1000);
     let body;
     try {
         if (useRegex) {
             body = pattern;
         } else {
             body = escapeRegexLiteral(pattern);
             if (opts.wholeWord === true) {
                 body = `\\b(?:${body})\\b`;
             }
         }
     } catch (e) {
         // Handle regex compilation error
         return { pattern, matches: [], success: false, error: String(e) };
     }

    const relScope = typeof payload.path === 'string' && payload.path ? payload.path : '.';
    const scopeAbs = resolveUnderProjectRoot(projectPath, relScope);
    if (!scopeAbs) {
        return { pattern, matches: [], success: false, error: 'path outside project' };
    }

    const rootResolved = path.resolve(projectPath);
    const matches = [];

     function lineMatches(line, lineReSource, flags) {
         try { return new RegExp(lineReSource, flags).test(line); } catch (e) { 
             // Log regex error for debugging but return false to continue processing
             if (process.env.NODE_ENV === 'development') {
                 console.warn('Regex error in lineMatches:', e.message);
             }
             return false; 
         }
     }

    const flags = opts.caseSensitive === true ? '' : 'i';

    async function scanFile(fullPath) {
        const relFile = path.relative(rootResolved, fullPath).replace(/\\/g, '/');
        let text;
        try { text = await fsp.readFile(fullPath, 'utf8'); } catch { return; }
        if (text.length > 500_000) return;
        const lines = text.split('\n');
        for (let i = 0; i < lines.length && matches.length < maxResults; i++) {
            if (lineMatches(lines[i], body, flags)) {
                matches.push({ file: relFile, line: i + 1, column: 0, content: lines[i].slice(0, 500), match: pattern });
            }
        }
    }

    async function walkDir(absDir, depth) {
        if (depth > 12 || matches.length >= maxResults) return;
        let entries;
        try { entries = await fsp.readdir(absDir, { withFileTypes: true }); } catch { return; }
        for (const ent of entries) {
            if (matches.length >= maxResults) break;
            const name = ent.name;
            if (name === 'node_modules' || name === '.git') continue;
            const full = path.join(absDir, name);
            if (ent.isDirectory()) {
                await walkDir(full, depth + 1);
            } else if (ent.isFile()) {
                await scanFile(full);
            }
        }
    }

    try {
        const st = await fsp.stat(scopeAbs);
        if (st.isFile()) {
            await scanFile(scopeAbs);
        } else {
            await walkDir(scopeAbs, 0);
        }
        return { pattern, path: relScope, matches, success: true, total: matches.length };
    } catch (e) {
        return { pattern, matches: [], success: false, error: e instanceof Error ? e.message : String(e) };
    }
}
