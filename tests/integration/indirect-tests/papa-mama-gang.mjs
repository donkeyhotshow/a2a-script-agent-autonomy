import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** indirect-tests → integration → tests → repo root */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:5173';
const SERVER_BASE = (process.env.A2A_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '');

function artifactScanArgs(scriptBase, strictArtifacts) {
    const args = [`tests/integration/direct-tests/validators/${scriptBase}`, '--skip-if-missing'];
    if (process.env.MAMA_ARTIFACT_STRICT === '1' || strictArtifacts) args.push('--strict');
    return args;
}

function parseGangArgs(argv) {
    const e2eOnlyArg = argv.find((a) => a.startsWith('--e2e-only='));
    const recon = argv.includes('--recon');
    return {
        mamaOnly: argv.includes('--mama-only'),
        papaOnly: argv.includes('--papa-only'),
        e2eOnly: e2eOnlyArg ? e2eOnlyArg.slice('--e2e-only='.length).trim() : '',
        strictArtifacts: argv.includes('--strict-artifacts') || recon,
        recon,
        help: argv.includes('--help') || argv.includes('-h'),
    };
}

function printHelp() {
    console.log(`Papa & Mama Gang — ${path.join('tests', 'integration', 'indirect-tests', 'papa-mama-gang.mjs')}

Flags:
  --mama-only          Run Mama shift only (offline + units + sims)
  --papa-only          Run Papa shift only (needs :3000 + Client API)
  --e2e-only=a,b       Forward to e2e-dialog-test.js as --only=
  --strict-artifacts   scan-promise-bodies + scan-session-responses with --strict (or set MAMA_ARTIFACT_STRICT=1)
  --recon              Battle recon: --strict-artifacts + sim:validate:all:contract + REQUIRE_ASYNC_PIPELINE for Papa E2E

Env (examples):
  CLIENT_API_URL           Client API base (default http://localhost:5173)
  A2A_SERVER_URL           Papa health check + E2E server (default http://localhost:3000)
  MAMA_SIM_STEP_CONTRACT=1 Use sim:validate:all:contract (--step-contract) instead of sim:validate:all
  PAPA_E2E_ONLY            Comma-separated e2e scenario names (--only=)
  PAPA_REQUIRE_ASYNC=1     Set REQUIRE_ASYNC_PIPELINE=1 for e2e-dialog-test.js
  PAPA_SERVER_VITEST_ALL=1 After E2E, run npm run test:server:unit:all
  GANG_ORIENT_SESSION=1    After green run, open gang-orient-session.mjs

npm (repo root):
  npm run test:recon       Full gang with --recon (stack up for Papa)
  npm run test:recon:mama  Offline recon only (strict + contract sims)
`);
}

// Helper to run a command
function runCmd(name, cmd, args, cwd = REPO_ROOT, env = process.env) {
    return new Promise((resolve, reject) => {
        console.log(`\n[${name}] 🚀 Запуск: ${cmd} ${args.join(' ')}`);
        const proc = spawn(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
        
        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`[${name}] ✅ Успешно завершено.\n`);
                resolve();
            } else {
                console.error(`[${name}] ❌ Ошибка (код ${code}).\n`);
                reject(new Error(`Command failed: ${name}`));
            }
        });
    });
}

function printHandshake() {
    console.log('====================================================');
    console.log('🤝 ЗНАКОМСТВО СМЕН (не «без крыши» — есть план)');
    console.log('====================================================');
    console.log(
        '👩 MAMA: `npm run test:indirect` = весь `tests/indirect-tests/run-all.mjs` — registry, schemas, imports, prompts,'
    );
    console.log(
        '   Mama Red (example + sim/agent), Mama Gray (example + compress_history + clarify + algorithm_invoke),'
    );
    console.log('   sticky-router audit, execute-shape audit, sim choice descriptions, `verify-gray-room-state` on sequence fixture.');
    console.log(
        '👩 MAMA (после indirect): сканы proxy_logs + sessions (`--skip-if-missing`). Строго: `MAMA_ARTIFACT_STRICT=1` или флаг `--strict-artifacts`.'
    );
    console.log('👩 MAMA: `test:direct-tests`, `test:server:unit`, client + web Vitest (`--passWithNoTests`), `sim:lint:all`, `sim:validate:all` (+ `MAMA_SIM_STEP_CONTRACT=1` → contract).');
    console.log(
        '🧔 PAPA: :3000 + Client API → `e2e-dialog-test.js` + `E2E_DIRECT_LOW_LLM=1`. `PAPA_REQUIRE_ASYNC=1` → строгий async. Сузить: `PAPA_E2E_ONLY` / `--e2e-only=`. После E2E: `PAPA_SERVER_VITEST_ALL=1`.'
    );
    console.log('📎 Норма: PAPA-MAMA.md (корень репозитория)');
    console.log('🐕 (банда лает дружелюбно: гав-гав, держим друг друга в курсе.)');
    console.log('🎯 РАЗВЕДКА: `npm run test:recon` или `--recon` — жёстче Mama + async-контроль у Papa.');
    console.log('====================================================\n');
}

async function mamaShift(opts = {}) {
    console.log('====================================================');
    console.log('👩 MAMA SHIFT: Офлайн проверки, схемы, фикстуры, юнит-тесты');
    console.log('====================================================');
    console.log('👩 "Я проверяю фундамент. Быстро, жестко, без сети."');
    console.log('👩 "Папа, я уже перечислила зону ответственности выше — не дублируй мои шаги вручную."\n');

    try {
        // 1. Indirect tests (Mama core: full run-all.mjs — see printHandshake)
        await runCmd('Mama Core', 'npm', ['run', 'test:indirect']);

        await runCmd('Mama Scan proxy_logs', 'node', artifactScanArgs('scan-promise-bodies.mjs', opts.strictArtifacts));
        await runCmd('Mama Scan sessions', 'node', artifactScanArgs('scan-session-responses.mjs', opts.strictArtifacts));

        // 2. Direct-tests Vitest (schema guards / router transition — no stack)
        await runCmd('Mama Direct Vitest', 'npm', ['run', 'test:direct-tests']);

        // 3. Server Unit Tests
        await runCmd('Mama Server Units', 'npm', ['run', 'test:server:unit']);

        // 4. Client Unit Tests
        await runCmd('Mama Client Units', 'npm', ['test'], path.join(REPO_ROOT, 'a2a-client'));

        // 4b. Web package (Vite shell) Vitest — passWithNoTests until web has *.test files
        await runCmd('Mama Web Package', 'npx', ['vitest', 'run', '--passWithNoTests'], path.join(REPO_ROOT, 'a2a-client', 'packages', 'web'));

        // 5–6. Simulations lint + validate
        await runCmd('Mama Sims Lint', 'npm', ['run', 'sim:lint:all']);
        const simValidateScript =
            process.env.MAMA_SIM_STEP_CONTRACT === '1' || opts.simStepContract
                ? 'sim:validate:all:contract'
                : 'sim:validate:all';
        await runCmd('Mama Sims Validate', 'npm', ['run', simValidateScript]);

        // 7. Proba-servera (in-process invoke — no HTTP)
        await runCmd('Mama depth (proba-servera)', 'npm', ['run', 'validate:proba-servera']);

        console.log(
            '👩 MAMA: "Смена закрыта: indirect + scans + direct Vitest + server Vitest (offline) + client + web Vitest + sim:lint + sim:validate:all + proba-servera. Папа, если стек жив — знакомься с проводом."\n'
        );
    } catch (e) {
        console.error('👩 MAMA: "Стоп! На моей смене косяки. Папа может спать дальше."');
        process.exit(1);
    }
}

async function papaShift(opts = {}) {
    console.log('====================================================');
    console.log('🧔 PAPA SHIFT: Живой стек, E2E, реальные LLM вызовы');
    console.log('====================================================');
    console.log('🧔 "Я проверяю интеграцию в бою. Медленно, но верно."');
    console.log('🧔 "Мама уже засыпала меня артефактами из run-all — я не отменяю её работу, я добавляю HTTP."\n');
    
    try {
        const server = await fetch(`${SERVER_BASE}/health`);
        if (!server.ok) throw new Error('server not healthy');
    } catch (e) {
        console.log(`🧔 PAPA: "A2A server недоступен (${SERVER_BASE}/health). Поднимите start-all.bat, потом повторите."`);
        console.log('🧔 PAPA: "Пропускаю смену (E2E отменены)."');
        return;
    }

    try {
        const client = await fetch(`${CLIENT_API_URL}/api/a2a/projects`);
        if (!client.ok) throw new Error('client API not ok');
    } catch (e) {
        console.log(
            `🧔 PAPA: "Client API недоступен (${CLIENT_API_URL}). E2E ходит в Vite /api/a2a — поднимите стек целиком."`
        );
        console.log('🧔 PAPA: "Пропускаю смену (E2E отменены). Переопределите CLIENT_API_URL при другом origin."');
        return;
    }

    try {
        // Direct E2E Tests (Papa: Client API contour)
        const env = { ...process.env, E2E_DIRECT_LOW_LLM: '1' };
        if (process.env.PAPA_REQUIRE_ASYNC === '1' || opts.recon) {
            env.REQUIRE_ASYNC_PIPELINE = '1';
        }
        const only =
            opts.e2eOnly ||
            (typeof process.env.PAPA_E2E_ONLY === 'string' && process.env.PAPA_E2E_ONLY.trim()) ||
            (typeof process.env.E2E_DIRECT_ONLY === 'string' && process.env.E2E_DIRECT_ONLY.trim()) ||
            '';
        const e2eArgs = ['tests/integration/direct-tests/e2e-dialog-test.js'];
        if (only) e2eArgs.push(`--only=${only}`);
        await runCmd('Papa E2E', 'node', e2eArgs, REPO_ROOT, env);

        if (process.env.PAPA_SERVER_VITEST_ALL === '1') {
            await runCmd('Papa Server Vitest (full)', 'npm', ['run', 'test:server:unit:all'], REPO_ROOT, env);
        }

        console.log('🧔 PAPA: "Моя смена окончена. Интеграция работает как часы. Банда рулит!"\n');
    } catch (e) {
        console.error('🧔 PAPA: "На моей смене провал. Кто-то сломал интеграцию!"');
        process.exit(1);
    }
}

async function main() {
    const { mamaOnly, papaOnly, e2eOnly, strictArtifacts, recon, help } = parseGangArgs(process.argv.slice(2));
    if (help) {
        printHelp();
        process.exit(0);
    }
    if (mamaOnly && papaOnly) {
        console.error('Use only one of --mama-only or --papa-only');
        process.exit(2);
    }

    console.log('🔥 PAPA & MAMA GANG ORCHESTRATOR 🔥');
    console.log('Банда захватывает контроль над всеми тестами проекта.');
    if (recon) console.log('Mode: BATTLE RECON (--recon) — strict artifacts, sim --step-contract, Papa async enforced');
    if (mamaOnly) console.log('Flags: --mama-only');
    if (papaOnly) console.log('Flags: --papa-only');
    if (e2eOnly) console.log(`Flags: --e2e-only=${e2eOnly}`);
    if (strictArtifacts && !recon) console.log('Flags: --strict-artifacts');
    console.log('');
    printHandshake();

    if (!papaOnly) await mamaShift({ strictArtifacts, simStepContract: recon });
    if (!mamaOnly) await papaShift({ e2eOnly, recon });
    
    console.log('====================================================');
    console.log('👁️  БАНДА: "Скрипт говорит, что проблем нет? ЭТО НЕПРАВДА."');
    console.log('👁️  "Нет проблем = ищи проблемы. Найдёшь — вшей проверку в скрипт (или в наши тесты)."');
    console.log('👁️  "Мы злопамятные на тех, кто делает нам проблемы, поэтому всех на входе посчитаем."');
    console.log('👁️  "И вот когда проект будет реально целостен... магия будет происходить так быстро, что все будут пукан рвать."');
    console.log('====================================================');

    if (process.env.GANG_ORIENT_SESSION === '1') {
        const orientPath = path.join(__dirname, 'gang-orient-session.mjs');
        console.log('\n🪝 GANG_ORIENT_SESSION=1 → opening orientation session (Client API)…\n');
        await new Promise((resolve, reject) => {
            const proc = spawn(process.execPath, [orientPath], {
                cwd: REPO_ROOT,
                env: process.env,
                stdio: 'inherit',
            });
            proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`orient exit ${code}`))));
        }).catch((e) => {
            console.warn('[Gang] Orientation hook failed (non-fatal for test:gang):', e.message);
        });
    }
}

main();