#!/usr/bin/env tsx

/**
 * Скрипт для запуска всех симуляций в директории
 *
 * Использование:
 *   npx tsx scripts/run-all-simulations.ts <simulations-dir>
 *
 * Пример:
 *   npx tsx scripts/run-all-simulations.ts ../simulations/pilot
 *
 * Результат:
 *   - Находит все папки с request.json
 *   - Запускает каждую симуляцию
 *   - Сохраняет ответы в server-response.json
 */

import {readFileSync, writeFileSync, existsSync, readdirSync, statSync} from 'node:fs';
import {join, dirname} from 'node:path';

const simBaseDir = process.argv[2];
if (!simBaseDir) {
    console.error('Usage: npx tsx scripts/run-all-simulations.ts <simulations-dir>');
    console.error('Example: npx tsx scripts/run-all-simulations.ts ../simulations/pilot');
    process.exit(1);
}

console.log(`\n🔄 Running all simulations in: ${simBaseDir}\n`);

// Найти все папки с request.json
function findSimulationDirs(baseDir: string): string[] {
    const dirs: string[] = [];

    try {
        const entries = readdirSync(baseDir);

        for (const entry of entries) {
            const fullPath = join(baseDir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                const requestPath = join(fullPath, 'request.json');
                if (existsSync(requestPath)) {
                    dirs.push(fullPath);
                } else {
                    // Рекурсивно ищем в подпапках
                    const subDirs = findSimulationDirs(fullPath);
                    dirs.push(...subDirs);
                }
            }
        }
    } catch (err: any) {
        console.error(`Error reading directory: ${err.message}`);
    }

    // Сортируем по имени
    return dirs.sort();
}

const simDirs = findSimulationDirs(simBaseDir);

if (simDirs.length === 0) {
    console.error('❌ No simulations found');
    process.exit(1);
}

console.log(`📊 Found ${simDirs.length} simulations:\n`);
simDirs.forEach((dir, i) => {
    console.log(`   ${i + 1}. ${dir}`);
});
console.log('');

// Вызываем серверный код напрямую
async function runAllSimulations() {
    const {invoke} = await import('../src/services/invoke.service.js');
    const {requestService} = await import('../src/services/request.service.js');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < simDirs.length; i++) {
        const simDir = simDirs[i];
        const requestPath = join(simDir, 'request.json');
        const responsePath = join(simDir, 'server-response.json');

        console.log(`\n[${i + 1}/${simDirs.length}] 📁 ${simDir}`);

        // Читаем request.json
        let requestData: any;
        try {
            const requestContent = readFileSync(requestPath, 'utf-8');
            requestData = JSON.parse(requestContent);
        } catch (err: any) {
            console.error(`   ❌ Error reading request.json: ${err.message}`);
            failCount++;
            continue;
        }

        // Разные форматы запросов
        const message = requestData.task ||
            requestData.message ||
            requestData.context?.task ||
            requestData.context?.message ||
            'N/A';

        // Контекст - базовый формат
        const context = requestData.context?.version
            ? requestData.context
            : {
                version: '1.0',
                session_id: 'stateless',
                ...requestData.context
            };

        console.log(`   📝 Task: ${message}`);
        console.log(`   📝 Action: ${requestData.action || 'N/A'}`);

        try {
            // Вызываем invoke
            const {promiseId} = await invoke('simulation-client', {
                context: context,
                message: message,
            });

            console.log(`   🔄 Promise ID: ${promiseId}`);

            // Ждем результат (polling)
            let result = null;
            const maxAttempts = 60;
            const delay = 500;

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await new Promise(resolve => setTimeout(resolve, delay));

                result = await requestService.getResult(promiseId);

                if (result && result.status === 'completed') {
                    console.log(`   ✅ Status: completed (attempt ${attempt + 1})`);
                    break;
                }
            }

            if (!result) {
                console.error('   ❌ No result after timeout');
                failCount++;
                continue;
            }

            // Форматируем даты
            const formatDate = (d: any) => d?.toISOString ? d.toISOString() : d;

            // Формируем ответ
            const response = {
                success: result.status === 'completed',
                data: {
                    id: result.id,
                    promiseId: result.promiseId,
                    clientId: result.clientId,
                    status: result.status,
                    priority: result.priority,
                    context: result.context,
                    message: result.message,
                    codeBlocks: result.codeBlocks,
                    result: result.result,
                    error: result.error,
                    createdAt: formatDate(result.createdAt),
                    startedAt: formatDate(result.startedAt),
                    completedAt: formatDate(result.completedAt),
                }
            };

            // Сохраняем с отступами
            writeFileSync(responsePath, JSON.stringify(response, null, 2));
            console.log(`   💾 Saved to: ${responsePath}`);
            console.log(`   📊 Outcome: ${result.result?.['outcome'] || 'N/A'}`);

            successCount++;

        } catch (err: any) {
            console.error(`   ❌ Error: ${err.message}`);
            failCount++;
        }

        // Небольшая пауза между симуляциями
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📈 Results: ${successCount} success, ${failCount} failed`);
    console.log('='.repeat(50) + '\n');
}

runAllSimulations();
