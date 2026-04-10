import fs from 'fs';
import path from 'path';
const API_PREFIX = '/api/a2a';
/**
 * Simple YAML parser for action definitions
 * Parses basic YAML structure without external dependencies
 * Handles multi-line values and proper key extraction
 */
function parseYamlSimple(content) {
    const result = {};
    const lines = content.split('\n');
    let currentKey = '';
    let inMultiLine = false;
    let multiLineKey = '';
    let multiLineValue = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        // Check for multi-line value continuation
        if (inMultiLine) {
            if (trimmed.match(/^\w+:/)) {
                // New key started, finish multi-line
                result[multiLineKey] = multiLineValue.trim();
                inMultiLine = false;
                currentKey = '';
            }
            else if (trimmed.startsWith('- ')) {
                // List item in multi-line context - switch to array mode
                if (!result[multiLineKey] || !Array.isArray(result[multiLineKey])) {
                    result[multiLineKey] = [];
                }
                result[multiLineKey].push(trimmed.substring(2).trim());
            }
            else {
                multiLineValue += ' ' + trimmed;
            }
            continue;
        }
        // Key-value pair
        const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            let value = kvMatch[2];
            // Check if multi-line value follows
            if (value === '' || value === '|') {
                inMultiLine = true;
                multiLineKey = key;
                multiLineValue = '';
                currentKey = key;
                continue;
            }
            value = value.replace(/^"["']|["']"$/g, '');
            if (key === 'triggers' || key === 'mixins') {
                result[key] = [];
                currentKey = key;
            }
            else if (key === 'id' || key === 'title' || key === 'description' || key === 'version' || key === 'context') {
                result[key] = value;
                currentKey = key;
            }
            else {
                result[key] = value;
                currentKey = key;
            }
            continue;
        }
        // List item
        const listMatch = trimmed.match(/^-\s+(.+)$/);
        if (listMatch && currentKey) {
            const itemValue = listMatch[1].replace(/^["']|["']$/g, '');
            if (!result[currentKey] || !Array.isArray(result[currentKey])) {
                result[currentKey] = [];
            }
            result[currentKey].push(itemValue);
        }
    }
    // Handle remaining multi-line
    if (inMultiLine && multiLineKey) {
        result[multiLineKey] = multiLineValue.trim();
    }
    return result;
}
/**
 * Create routes for /api/a2a/actions
 * Returns list of available actions from a2a-server/src/actions/definitions/
 */
export function createActionsRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(`${API_PREFIX}/actions`)) {
            return next();
        }
        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);
        // GET /api/a2a/actions
        if (req.method === 'GET' && p === '/actions') {
            try {
                // Determine base path - look for a2a-server in parent or current
                let basePath = cwd || process.cwd();
                // Debug: log what we're working with
                console.log('[actions] cwd:', cwd, 'process.cwd():', process.cwd());
                let actionsPath = path.join(basePath, '..', 'a2a-server', 'src', 'actions', 'definitions');
                // Fallback: check if we're at project root (no a2a-client suffix)
                if (!fs.existsSync(actionsPath)) {
                    const altPath = path.join(basePath, 'a2a-server', 'src', 'actions', 'definitions');
                    if (fs.existsSync(altPath)) {
                        actionsPath = altPath;
                    }
                }
                // Fallback: check parent of parent
                if (!fs.existsSync(actionsPath)) {
                    const parentPath = path.join(basePath, '..', '..', 'a2a-server', 'src', 'actions', 'definitions');
                    if (fs.existsSync(parentPath)) {
                        actionsPath = parentPath;
                    }
                }
                if (!fs.existsSync(actionsPath)) {
                    console.error('[actions] Path not found:', actionsPath);
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Actions definitions not found' }));
                    return;
                }
                console.log('[actions] Reading from:', actionsPath);
                const actions = [];
                // Read YAML actions
                const yamlPath = path.join(actionsPath, 'yaml', 'actions');
                if (fs.existsSync(yamlPath)) {
                    const yamlFiles = fs.readdirSync(yamlPath).filter(f => f.endsWith('.yaml'));
                    for (const file of yamlFiles) {
                        try {
                            const content = fs.readFileSync(path.join(yamlPath, file), 'utf-8');
                            const parsed = parseYamlSimple(content);
                            if (parsed.id) {
                                actions.push({
                                    id: parsed.id,
                                    title: parsed.title || parsed.id,
                                    description: parsed.description || '',
                                    type: 'yaml',
                                    triggers: parsed.triggers || [],
                                    context: parsed.context || {},
                                    steps: []
                                });
                            }
                        }
                        catch (e) {
                            console.error('[actions] Error parsing', file, e.message);
                        }
                    }
                }
                // Read MD definitions (excluding auto-ai placeholders)
                const mdFiles = fs.readdirSync(actionsPath).filter(f => f.endsWith('.md') && f !== 'README.md');
                for (const file of mdFiles) {
                    // Skip auto-ai placeholder files
                    if (file.startsWith('auto-ai/'))
                        continue;
                    try {
                        const content = fs.readFileSync(path.join(actionsPath, file), 'utf-8');
                        const id = file.replace('.md', '');
                        // Parse title from first heading
                        const titleMatch = content.match(/^#\s+(.+)$/m);
                        const title = titleMatch ? titleMatch[1] : id;
                        // Parse description (first paragraph after title)
                        const descMatch = content.match(/^#\s+.+\n\n(.+?)(?=\n##|\n#|$)/s);
                        const description = descMatch ? descMatch[1].trim() : '';
                        // Count sub-actions
                        const subActionMatches = content.match(/^###\s+\d+\.\s+/gm);
                        const steps = subActionMatches ? subActionMatches.map(m => m.replace(/^###\s+\d+\.\s+/, '').trim()) : [];
                        actions.push({
                            id,
                            title,
                            description: description.substring(0, 200),
                            type: 'md',
                            steps
                        });
                    }
                    catch (e) {
                        console.error('[actions] Error parsing', file, e.message);
                    }
                }
                // Read auto-ai subdirectory
                const autoAiPath = path.join(actionsPath, 'auto-ai');
                if (fs.existsSync(autoAiPath)) {
                    const autoAiFiles = fs.readdirSync(autoAiPath).filter(f => f.endsWith('.md'));
                    for (const file of autoAiFiles) {
                        try {
                            const content = fs.readFileSync(path.join(autoAiPath, file), 'utf-8');
                            const id = `auto-ai/${file.replace('.md', '')}`;
                            const titleMatch = content.match(/^#\s+(.+)$/m);
                            const title = titleMatch ? titleMatch[1] : id;
                            actions.push({
                                id,
                                title,
                                description: 'Auto-AI placeholder action',
                                type: 'auto-ai',
                                steps: []
                            });
                        }
                        catch (e) {
                            console.error('[actions] Error parsing auto-ai/', file, e.message);
                        }
                    }
                }
                console.log('[actions] Found', actions.length, 'actions');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ actions }));
            }
            catch (error) {
                console.error('[actions] Error:', error);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }
        next();
    };
}
