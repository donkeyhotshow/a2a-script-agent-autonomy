import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

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

async function mamaShift() {
    console.log('====================================================');
    console.log('👩 MAMA SHIFT: Офлайн проверки, схемы, фикстуры, юнит-тесты');
    console.log('====================================================');
    console.log('👩 "Я проверяю фундамент. Быстро, жестко, без сети."\n');
    
    try {
        // 1. Indirect tests (Mama core: red/gray rooms, action registry)
        await runCmd('Mama Core', 'npm', ['run', 'test:indirect']);
        
        // 2. Server Unit Tests
        await runCmd('Mama Server Units', 'npm', ['run', 'test:server:unit']);
        
        // 3. Client Unit Tests
        await runCmd('Mama Client Units', 'npm', ['test'], path.join(REPO_ROOT, 'a2a-client'));
        
        // 4. Simulations validation
        await runCmd('Mama Sims Validate', 'npm', ['run', 'sim:validate', '--', '--all']);

        // 5. Proba-servera (in-process invoke — no HTTP)
        await runCmd('Mama depth (proba-servera)', 'npm', ['run', 'validate:proba-servera']);
        
        console.log('👩 MAMA: "Моя смена окончена. База чиста, схемы валидны. Папа, твой выход!"\n');
    } catch (e) {
        console.error('👩 MAMA: "Стоп! На моей смене косяки. Папа может спать дальше."');
        process.exit(1);
    }
}

async function papaShift() {
    console.log('====================================================');
    console.log('🧔 PAPA SHIFT: Живой стек, E2E, реальные LLM вызовы');
    console.log('====================================================');
    console.log('🧔 "Я проверяю интеграцию в бою. Медленно, но верно."\n');
    
    // Check if stack is up
    try {
        const res = await fetch('http://localhost:3000/health');
        if (!res.ok) throw new Error('Stack not healthy');
    } catch (e) {
        console.log('🧔 PAPA: "Стек лежит! Сначала поднимите сервера (start-all.bat), потом зовите меня."');
        console.log('🧔 PAPA: "Пропускаю свою смену (E2E тесты отменены)."');
        return;
    }

    try {
        // Direct E2E Tests (Papa: Client API contour)
        const env = { ...process.env, E2E_DIRECT_LOW_LLM: '1' };
        await runCmd('Papa E2E', 'node', ['tests/direct-tests/e2e-dialog-test.js'], REPO_ROOT, env);
        
        console.log('🧔 PAPA: "Моя смена окончена. Интеграция работает как часы. Банда рулит!"\n');
    } catch (e) {
        console.error('🧔 PAPA: "На моей смене провал. Кто-то сломал интеграцию!"');
        process.exit(1);
    }
}

async function main() {
    console.log('🔥 PAPA & MAMA GANG ORCHESTRATOR 🔥');
    console.log('Банда захватывает контроль над всеми тестами проекта.\n');
    
    await mamaShift();
    await papaShift();
    
    console.log('====================================================');
    console.log('👁️  БАНДА: "Скрипт говорит, что проблем нет? ЭТО НЕПРАВДА."');
    console.log('👁️  "Нет проблем = ищи проблемы. Найдёшь — вшей проверку в скрипт (или в наши тесты)."');
    console.log('👁️  "Мы злопамятные на тех, кто делает нам проблемы, поэтому всех на входе посчитаем."');
    console.log('👁️  "И вот когда проект будет реально целостен... магия будет происходить так быстро, что все будут пукан рвать."');
    console.log('====================================================');
}

main();