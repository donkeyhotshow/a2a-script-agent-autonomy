#!/usr/bin/env tsx

/**
 * Скрипт для запуска симуляции
 *
 * Использование:
 *   npm run sim:run <sim-dir>
 *   npm run sim:run-all
 *
 * Пример:
 *   npm run sim:run fix-vue-imports
 *   npm run sim:run-all
 *
 * Результат:
 *   - Читает request.json
 *   - Вызывает invoke()
 *   - Сохраняет сырой ответ invoke в invoke-capture.json (не golden; см. simulations/SCHEMA.md)
 */

import {existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {findSimulationDirs, runSingleSimulation, simDisplayName} from './sim-run-core.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isAll = process.argv.includes('--all');
const simDirArg = isAll ? null : process.argv[2];

if (!isAll && !simDirArg) {
    console.error('❌ Usage: npm run sim:run <sim-dir>');
    console.error('   Example: npm run sim:run fix-vue-imports');
    console.error('');
    console.error('   Или запустить все: npm run sim:run-all');
    process.exit(1);
}

async function main() {
    const baseDir = join(__dirname, '..', '..', 'simulations');

    if (isAll) {
        console.log('\n🔄 Running all simulations...\n');

        const simDirs = findSimulationDirs(baseDir);

        if (simDirs.length === 0) {
            console.error('❌ No simulations found');
            process.exit(1);
        }

        console.log(`📊 Found ${simDirs.length} simulations:\n`);
        simDirs.forEach((dir, i) => {
            console.log(`   ${i + 1}. ${simDisplayName(baseDir, dir)}`);
        });
        console.log('');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < simDirs.length; i++) {
            const simDir = simDirs[i];
            const simName = simDisplayName(baseDir, simDir);

            console.log(`\n[${i + 1}/${simDirs.length}] ${'='.repeat(40)}`);

            const success = await runSingleSimulation(simDir, baseDir);

            if (success) {
                successCount++;
                console.log(`\n✅ ${simName}: Пройдено`);
            } else {
                failCount++;
                console.log(`\n❌ ${simName}: Провалено`);
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('\n' + '='.repeat(50));
        console.log(`📈 ИТОГО: ${successCount}/${simDirs.length} пройдено`);
        console.log(`   ✅ Успешно: ${successCount}`);
        console.log(`   ❌ Провалено: ${failCount}`);
        console.log('='.repeat(50) + '\n');

    } else {
        const simDir = join(baseDir, simDirArg!);

        if (!existsSync(simDir) || !existsSync(join(simDir, 'request.json'))) {
            console.error(`❌ Simulation not found: ${simDir}`);
            console.error(`   Available simulations:`);

            const simDirs = findSimulationDirs(baseDir);
            simDirs.forEach(dir => {
                console.log(`   - ${simDisplayName(baseDir, dir)}`);
            });
            process.exit(1);
        }

        const success = await runSingleSimulation(simDir, baseDir);

        if (success) {
            console.log('\n✅ Симуляция успешно завершена');
            process.exit(0);
        } else {
            console.log('\n❌ Симуляция провалена');
            process.exit(1);
        }
    }
}

main();
