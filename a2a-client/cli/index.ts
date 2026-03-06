#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execSync, spawn} from 'node:child_process';
import {HistoryManager} from '../packages/history/src/history-manager.ts';

type GlobalOptions = {
    project?: string;
    json?: boolean;
};

const usage = `
Usage: npm run cli [--project <path>] [--json] <command> [args...]

Global options:
  --project <path>   Override the client project root (defaults to parent of this CLI).
  --json             Emit raw JSON instead of formatted tables.

Commands:
  list-sessions              List session metadata stored inside .a2a-sessions.
  show-session [sessionId]   Print plan/task summary for a session (uses the first session if none provided).
  exchange-log <sessionId>   Dump the exchange log (type filter via --type=request|response|error).
  messages <sessionId>       Show reconstructed messages stored for a session.
  create-session <name>      Create a new session (optional --description and --tags).
  add-exchange <sessionId>   Append an exchange-log entry (--type, --content, --metadata).
  start-promise-daemon       Start the promise processing daemon (ai-integration/scripts/promise_queue_daemon.py).

Examples:
  npm run cli list-sessions
  npm run cli show-session 86a2c3e --json
  npm run cli exchange-log 86a2c3e --type=response
  npm run cli create-session "Manual test" --description "Testing offline flows"
  npm run cli add-exchange 86a2c3e --type=response --content '{"execute":{"form":{"choice":"confirm"}}}'
  npm run cli start-promise-daemon --interval 5 --log-level DEBUG
  npm run cli start-promise-daemon --dry-run --log-level INFO
`;

function splitArgs(args: string[]) {
    const positional: string[] = [];
    const options: Record<string, string> = {};
    let i = 0;
    while (i < args.length) {
        const current = args[i];
        if (current.startsWith('--')) {
            const key = current.slice(2);
            let value = 'true';
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                value = args[++i];
            }
            options[key] = value;
        } else {
            positional.push(current);
        }
        i++;
    }
    return {positional, options};
}

function parseGlobalOptions(rawArgs: string[]) {
    const globals: GlobalOptions = {};
    let commandName: string | undefined;
    const commandArgs: string[] = [];
    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg === '--project') {
            if (i + 1 >= rawArgs.length) {
                console.error('--project requires a path value.');
                process.exit(1);
            }
            globals.project = rawArgs[++i];
            continue;
        }
        if (arg === '--json') {
            globals.json = true;
            continue;
        }
        if (arg === '-h' || arg === '--help') {
            console.log(usage);
            process.exit(0);
        }
        if (!commandName) {
            commandName = arg;
            continue;
        }
        commandArgs.push(arg);
    }
    return {globals, commandName, commandArgs};
}

function formatArray(arr: string[]) {
    if (!arr.length) return '<none>';
    return arr.join(', ');
}

function printSessionSummary(session: Awaited<ReturnType<HistoryManager['getSession']>>) {
    if (!session) return;
    const {metadata, plans, tasks, context} = session;
    console.log(`Session: ${metadata.name} (${metadata.id})`);
    console.log(`  Status: ${metadata.status}  Updated: ${metadata.updatedAt}`);
    console.log(`  Tags: ${formatArray(metadata.tags)}`);
    console.log(`  Plans (${plans.length}): ${plans.map((p) => `${p.name}[${p.status}]`).join(', ') || '<none>'}`);
    console.log(`  Tasks (${tasks.length}): ${tasks.map((t) => `${t.name}[${t.status}]`).join(', ') || '<none>'}`);
    console.log(`  Exchange log entries: ${context?.exchangeLog?.length ?? 0}`);
    console.log(`  Messages stored: ${context?.messages?.length ?? 0}`);
}

async function resolveSession(historyManager: HistoryManager, sessionId?: string) {
    if (sessionId) {
        const session = await historyManager.getSession(sessionId);
        if (session) {
            await historyManager.switchSession(sessionId);
        }
        return session;
    }
    const active = await historyManager.getActiveSession();
    if (active) return active;
    const known = await historyManager.listSessions();
    if (!known.length) return null;
    const firstId = known[0].id;
    await historyManager.switchSession(firstId);
    return historyManager.getActiveSession();
}

async function main() {
    const rawArgs = process.argv.slice(2);
    if (!rawArgs.length) {
        console.log(usage);
        process.exit(0);
    }
    const {globals, commandName, commandArgs} = parseGlobalOptions(rawArgs);
    if (!commandName) {
        console.log('Command required.');
        console.log(usage);
        process.exit(1);
    }

    const cliDir = path.dirname(fileURLToPath(import.meta.url));
    const projectPath = path.resolve(globals.project || path.resolve(cliDir, '..'));

    const historyManager = new HistoryManager({projectPath});
    await historyManager.initialize();

    const {positional, options} = splitArgs(commandArgs);

    switch (commandName) {
        case 'list-sessions':
        case 'ls': {
            const sessions = await historyManager.listSessions();
            if (!sessions.length) {
                console.log('No sessions have been created yet.');
                return;
            }
            if (globals.json) {
                console.log(JSON.stringify(sessions, null, 2));
                return;
            }
            console.log(`Stored sessions at ${projectPath}/.a2a-sessions`);
            console.table(
                sessions.map((s) => ({
                    Id: s.id,
                    Name: s.name,
                    Status: s.status,
                    Updated: s.updatedAt,
                    Tags: s.tags.join(', ')
                }))
            );
            break;
        }

        case 'show-session':
        case 'show': {
            const session = await resolveSession(historyManager, positional[0]);
            if (!session) {
                console.error('Session not found.');
                process.exit(1);
            }
            if (globals.json) {
                console.log(JSON.stringify(session, null, 2));
                return;
            }
            printSessionSummary(session);
            break;
        }

        case 'exchange-log':
        case 'exchange': {
            const session = await resolveSession(historyManager, positional[0]);
            if (!session) {
                console.error('Session not found.');
                process.exit(1);
            }
            const entries = await historyManager.getExchangeLog();
            const filterType = options.type;
            const filtered =
                filterType && filterType !== 'all'
                    ? entries.filter((entry) => entry.type === filterType)
                    : entries;
            if (!filtered.length) {
                console.log('No exchange-log entries found.');
                return;
            }
            if (globals.json) {
                console.log(JSON.stringify(filtered, null, 2));
                return;
            }
            filtered.forEach((entry, index) => {
                console.log(`${index + 1}. [${entry.type}] ${entry.id} @ ${entry.timestamp}`);
                console.log(`   metadata: ${entry.metadata ? JSON.stringify(entry.metadata) : '<none>'}`);
                console.log(`   content: ${JSON.stringify(entry.content)}`);
            });
            break;
        }

        case 'messages': {
            const session = await resolveSession(historyManager, positional[0]);
            if (!session) {
                console.error('Session not found.');
                process.exit(1);
            }
            const messages = await historyManager.getMessages();
            if (!messages.length) {
                console.log('No stored messages.');
                return;
            }
            if (globals.json) {
                console.log(JSON.stringify(messages, null, 2));
                return;
            }
            messages.forEach((message, index) => {
                console.log(`${index + 1}. [${message.role}] ${message.timestamp}`);
                console.log(`   ${message.content}`);
            });
            break;
        }

        case 'create-session': {
            const name = positional[0];
            if (!name) {
                console.error('Session name is required.');
                process.exit(1);
            }
            const description = options.description ?? undefined;
            const tags = options.tags ? options.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
            const created = await historyManager.createSession(name, description, tags);
            console.log('Session created:');
            console.table(created);
            break;
        }

        case 'add-exchange': {
            const sessionId = positional[0];
            if (!sessionId) {
                console.error('Session ID is required.');
                process.exit(1);
            }
            const session = await resolveSession(historyManager, sessionId);
            if (!session) {
                console.error('Session not found.');
                process.exit(1);
            }
            const type = (options.type as 'request' | 'response' | 'error') ?? 'request';
            const rawContent = options.content;
            if (!rawContent) {
                console.error('--content is required and must be valid JSON.');
                process.exit(1);
            }
            let content: Record<string, unknown>;
            try {
                content = JSON.parse(rawContent);
            } catch (error) {
                console.error('Cannot parse --content JSON.');
                process.exit(1);
            }
            let metadata: Record<string, unknown> | undefined;
            if (options.metadata) {
                try {
                    metadata = JSON.parse(options.metadata);
                } catch (error) {
                    console.error('Cannot parse --metadata JSON.');
                    process.exit(1);
                }
            }
            await historyManager.addExchangeLog(type, content, metadata);
            console.log(`Added ${type} log to session ${session.metadata.id}.`);
            break;
        }

        case 'start-promise-daemon': {
            const cliDir = path.dirname(fileURLToPath(import.meta.url));
            const scriptPath = path.resolve(cliDir, '..', '..', 'ai-integration', 'scripts', 'promise_queue_daemon.py');
            
            // Build arguments for the daemon
            const daemonArgs: string[] = [];
            
            if (options.proxyUrl) {
                daemonArgs.push('--proxy-url', options.proxyUrl);
            }
            if (options.interval) {
                daemonArgs.push('--interval', options.interval);
            }
            if (options.timeout) {
                daemonArgs.push('--timeout', options.timeout);
            }
            if (options.logLevel) {
                daemonArgs.push('--log-level', options.logLevel);
            }
            if (options.dryRun === 'true') {
                daemonArgs.push('--dry-run');
            }
            if (options.noAutoApprove === 'true') {
                daemonArgs.push('--no-auto-approve');
            }
            if (options.maxEmptyCycles) {
                daemonArgs.push('--max-empty-cycles', options.maxEmptyCycles);
            }
            if (options.responseAttempts) {
                daemonArgs.push('--response-attempts', options.responseAttempts);
            }
            if (options.responseDelay) {
                daemonArgs.push('--response-delay', options.responseDelay);
            }

            console.log(`Starting promise daemon: python ${scriptPath} ${daemonArgs.join(' ')}`);
            
            const daemon = spawn('python', [scriptPath, ...daemonArgs], {
                stdio: 'inherit',
                shell: true,
                cwd: path.resolve(cliDir, '..', '..'),
            });

            daemon.on('error', (err) => {
                console.error('Failed to start promise daemon:', err.message);
                process.exit(1);
            });

            daemon.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Promise daemon exited with code ${code}`);
                }
                process.exit(code ?? 0);
            });

            // Handle Ctrl+C gracefully
            process.on('SIGINT', () => {
                console.log('\nStopping promise daemon...');
                daemon.kill('SIGINT');
            });

            process.on('SIGTERM', () => {
                daemon.kill('SIGTERM');
            });
            break;
        }

        default:
            console.error(`Unknown command: ${commandName}`);
            console.log(usage);
            process.exit(1);
    }
}

main().catch((err) => {
    console.error('CLI error:', err);
    process.exit(1);
});
