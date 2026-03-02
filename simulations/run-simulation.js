#!/usr/bin/env node

/**
 * Скрипт для запуска симуляций без запуска HTTP сервера
 *
 * Использование:
 *   node run-simulation.js <simulation-dir>
 *
 * Пример:
 *   node run-simulation.js pilot/1
 *
 * Результат:
 *   - Читает request.json
 *   - Вызывает invoke() напрямую
 *   - Сохраняет ответ в server-response.json
 */

import {readFileSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Аргументы
const simDir = process.argv[2];
if (!simDir) {
    console.error('Usage: node run-simulation.js <simulation-dir>');
    console.error('Example: node run-simulation.js pilot/1');
    process.exit(1);
}

const basePath = join(__dirname, simDir);
const requestPath = join(basePath, 'request.json');
const responsePath = join(basePath, 'server-response.json');

console.log(`\n📁 Simulation: ${simDir}`);
console.log(`   Request: ${requestPath}`);

// Читаем request.json
let requestData;
try {
    const requestContent = readFileSync(requestPath, 'utf-8');
    requestData = JSON.parse(requestContent);
} catch (err) {
    console.error(`❌ Error reading request.json: ${err.message}`);
    process.exit(1);
}

console.log(`   Request: ${JSON.stringify(requestData)}`);

// Вызываем серверный код напрямую
async function runSimulation() {
    try {
        // Динамический импорт серверного кода
        const {invoke} = await import('../a2a-server/dist/services/invoke.service.js');
        const {requestService} = await import('../a2a-server/dist/services/request.service.js');

        console.log('⏳ Invoking server...');

        // Вызываем invoke
        const {promiseId} = await invoke('simulation-client', {
            context: requestData.context,
            message: requestData.task || requestData.message,
        });

        console.log(`   Promise ID: ${promiseId}`);

        // Ждем результат ( polling )
        let result = null;
        const maxAttempts = 30;
        const delay = 500;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, delay));

            result = await requestService.getResult(promiseId);

            if (result && result.status === 'completed') {
                console.log(`   Status: ${result.status} (attempt ${i + 1})`);
                break;
            }

            if (i % 5 === 0) {
                console.log(`   Waiting... (attempt ${i + 1}/${maxAttempts})`);
            }
        }

        if (!result) {
            console.error('❌ No result after timeout');
            process.exit(1);
        }

        // Формируем ответ в том же формате что и HTTP
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
                createdAt: result.createdAt?.toISOString(),
                startedAt: result.startedAt?.toISOString(),
                completedAt: result.completedAt?.toISOString(),
            }
        };

        // Сохраняем с отступами
        writeFileSync(responsePath, JSON.stringify(response, null, 2));
        console.log(`✅ Response saved to: ${responsePath}`);

    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
}

runSimulation();
