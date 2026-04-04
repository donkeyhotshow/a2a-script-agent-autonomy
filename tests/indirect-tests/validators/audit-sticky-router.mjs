import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SESSIONS_DIR = path.join(REPO_ROOT, 'a2a-client', 'storage', 'sessions');

function parseArgs() {
    const args = process.argv.slice(2);
    let threshold = 0;
    let format = 'text';

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--threshold=')) {
            threshold = parseFloat(args[i].split('=')[1]);
        }
        if (args[i].startsWith('--format=')) {
            format = args[i].split('=')[1];
        }
    }
    return { threshold, format };
}

function getSessionDirs() {
    if (!fs.existsSync(SESSIONS_DIR)) return [];
    return fs.readdirSync(SESSIONS_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => path.join(SESSIONS_DIR, d.name));
}

function getSessionSteps(sessionDir) {
    const steps = [];
    for (const entry of fs.readdirSync(sessionDir, { withFileTypes: true })) {
        if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
            const stepNum = parseInt(entry.name, 10);
            const responsePath = path.join(sessionDir, entry.name, 'server-response.json');
            const requestPath = path.join(sessionDir, entry.name, 'request-to-server.json');
            const clientResultPath = path.join(sessionDir, entry.name, 'client-result.json');
            
            if (fs.existsSync(responsePath)) {
                steps.push({ stepNum, responsePath, requestPath, clientResultPath });
            }
        }
    }
    return steps.sort((a, b) => a.stepNum - b.stepNum);
}

function readJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
        return null;
    }
}

function analyzeSession(sessionDir) {
    const steps = getSessionSteps(sessionDir);
    const violations = [];
    const sessionId = path.basename(sessionDir);

    for (let i = 0; i < steps.length - 1; i++) {
        const current = steps[i];
        const next = steps[i + 1];

        const currRes = readJson(current.responsePath);
        const nextRes = readJson(next.responsePath);
        const clientRes = readJson(current.clientResultPath);

        if (!currRes || !nextRes) continue;

        // Unwrap session wrapper if present
        const currData = currRes.data || currRes;
        const nextData = nextRes.data || nextRes;

        const currAction = currData.context?.execution?.action;
        const currStep = currData.context?.execution?.step;
        const nextAction = nextData.context?.execution?.action;
        const nextStep = nextData.context?.execution?.step;

        const hasChoices = Array.isArray(currData.execute?.form?.choices);
        const clientChoice = clientRes?.choice || currData.result?.choice;

        // Check STICKY_ROUTER
        if (currAction === 'task' && currStep === 'router' && hasChoices && clientChoice) {
            // Client made a choice. The next step should NOT be the exact same router form.
            const nextHasChoices = Array.isArray(nextData.execute?.form?.choices);
            if (nextAction === 'task' && nextStep === 'router' && nextHasChoices && !nextData.result?.completed) {
                violations.push({
                    sessionId,
                    step: next.stepNum,
                    type: 'STICKY_ROUTER',
                    severity: 'high',
                    message: `Router stuck after choice '${clientChoice}'`
                });
            }
        }

        // Check ACTION_JUMP (action changed without completed/processing intermediate state)
        if (currAction && nextAction && currAction !== nextAction && currAction !== 'task') {
            // If action changed directly from e.g. dialog to agent without a router or completion
            if (!currData.result?.completed && currStep !== 'router' && nextStep !== 'router') {
                violations.push({
                    sessionId,
                    step: next.stepNum,
                    type: 'ACTION_JUMP',
                    severity: 'medium',
                    message: `Action jumped from ${currAction} to ${nextAction}`
                });
            }
        }
    }

    return violations;
}

function main() {
    const { threshold, format } = parseArgs();
    const sessionDirs = getSessionDirs();
    
    let totalSessions = sessionDirs.length;
    let allViolations = [];
    let sessionsWithViolations = new Set();

    for (const dir of sessionDirs) {
        const violations = analyzeSession(dir);
        if (violations.length > 0) {
            allViolations.push(...violations);
            sessionsWithViolations.add(path.basename(dir));
        }
    }

    const driftRate = totalSessions > 0 ? (sessionsWithViolations.size / totalSessions) * 100 : 0;
    const isFailed = driftRate > threshold;

    if (format === 'json') {
        console.log(JSON.stringify({
            sessionsScanned: totalSessions,
            violations: allViolations,
            driftRate: parseFloat(driftRate.toFixed(2)),
            passed: !isFailed
        }, null, 2));
    } else {
        console.log('=== Sticky Router & Action Jump Audit ===\n');
        console.log(`Sessions scanned: ${totalSessions}`);
        console.log(`Violations found: ${allViolations.length}`);
        console.log(`Drift rate: ${driftRate.toFixed(2)}% (Threshold: ${threshold}%)\n`);

        if (allViolations.length > 0) {
            console.log('Violations:');
            allViolations.forEach(v => {
                console.log(`- [${v.type}] Session ${v.sessionId} (Step ${v.step}): ${v.message}`);
            });
        }

        if (isFailed) {
            console.error(`\n❌ Audit failed: Drift rate ${driftRate.toFixed(2)}% exceeds threshold ${threshold}%`);
        } else {
            console.log(`\n✅ Audit passed`);
        }
    }

    process.exit(isFailed ? 1 : 0);
}

main();