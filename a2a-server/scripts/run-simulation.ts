#!/usr/bin/env tsx

/**
 * Скрипт для запуска симуляций из директории a2a-server
 *
 * Использование:
 *   npx tsx scripts/run-simulation.ts <simulation-dir>
 *
 * Пример:
 *   npx tsx scripts/run-simulation.ts ../simulations/pilot/1
 *
 * Результат:
 *   - Читает request.json
 *   - Вызывает invoke() напрямую
 *   - Сохраняет ответ в server-response.json
 */

import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const simDir = process.argv[2];
if (!simDir) {
    console.error('Usage: npx ts-node scripts/run-simulation.ts <simulation-dir>');
    console.error('Example: npx ts-node scripts/run-simulation.ts ../simulations/pilot/1');
    process.exit(1);
}

const requestPath = join(simDir, 'request.json');
const responsePath = join(simDir, 'server-response.json');

console.log(`\n📁 Simulation: ${simDir}`);
console.log(`   Request: ${requestPath}`);

// Читаем request.json
let requestData: any;
try {
    const requestContent = readFileSync(requestPath, 'utf-8');
    requestData = JSON.parse(requestContent);
} catch (err: any) {
    console.error(`❌ Error reading request.json: ${err.message}`);
    process.exit(1);
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

console.log(`   Request action: ${requestData.action}`);
console.log(`   Request task: ${message}`);

// Вызываем серверный код напрямую
async function runSimulation() {
    try {
        const {invoke} = await import('../src/services/utils/invoke.service.js');
        const {requestService} = await import('../src/services/core/request/request.service.js');
        const {actionRegistry} = await import('../src/actions/action-registry.js');
        try {
            await actionRegistry.loadFromDirectory();
            console.log(`   [ActionRegistry] Loaded ${actionRegistry.count} actions`);
        } catch (e) {
            console.warn('   [ActionRegistry] load failed — router may use static choices only', e);
        }

        console.log('\n⏳ Invoking server...');

        // Вызываем invoke - поддерживаем разные форматы
        // Task должен быть на верхнем уровне, не в message
        const invokeInput: any = {
            context: context,
        };

        // Добавляем task на верхний уровень если есть
        if (requestData.task) {
            invokeInput.task = requestData.task;
        } else if (requestData.message) {
            invokeInput.message = requestData.message;
        }

        // Add action type (task_request, approve_action, step_result)
        if (requestData.action) {
            invokeInput.action = requestData.action;
        }

        // Add selectedAction for approve_action
        if (requestData.selectedAction) {
            invokeInput.selectedAction = requestData.selectedAction;
        }

        if (requestData.result && typeof requestData.result === 'object') {
            if (requestData.stepId) {
                invokeInput.stepId = requestData.stepId;
                invokeInput.stepResult = requestData.result;
            } else {
                invokeInput.result = requestData.result;
            }
        }

        const {promiseId} = await invoke('simulation-client', invokeInput);

        console.log(`   Promise ID: ${promiseId}`);

        // Ждем результат (polling)
        let result = null;
        const maxAttempts = 60;
        const delay = 500;

        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, delay));

            result = await requestService.getResult(promiseId);

            if (result && result.status === 'completed') {
                console.log(`   Status: ${result.status} (attempt ${i + 1})`);
                break;
            }

            if (i % 10 === 0) {
                console.log(`   Waiting... (attempt ${i + 1}/${maxAttempts})`);
            }
        }

        if (!result) {
            console.error('❌ No result after timeout');
            process.exit(1);
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
        console.log(`\n✅ Response saved to: ${responsePath}`);
        console.log(`   Outcome: ${result.result?.['outcome'] || 'N/A'}`);

    } catch (err: any) {
        console.error(`\n❌ Error: ${err.message}`);
        if (err.stack) {
            console.error(err.stack.split('\n').slice(0, 5).join('\n'));
        }
        process.exit(1);
    }
}

runSimulation();
