#!/usr/bin/env node

/**
 * Скрипт для прямого исправления импортов в каждой папке изолировано
 * Использует actionProcessor для запуска fix-imports-generic действия
 */

import { actionProcessor } from '../a2a-server/packages/actions/src/action-processor.js';

// Окружение
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Папки для обработки
const directories = [
  {
    name: 'a2a-server',
    path: path.join(rootDir, 'a2a-server'),
    task: 'fix imports in a2a-server'
  },
  {
    name: 'a2a-server/packages/utils',
    path: path.join(rootDir, 'a2a-server', 'packages', 'utils'),
    task: 'fix imports in a2a-server utils'
  },
  {
    name: 'a2a-server/packages/features',
    path: path.join(rootDir, 'a2a-server', 'packages', 'features'),
    task: 'fix imports in a2a-server features'
  },
  {
    name: 'a2a-client',
    path: path.join(rootDir, 'a2a-client'),
    task: 'fix imports in a2a-client'
  },
  {
    name: 'a2a-client/packages/api-client',
    path: path.join(rootDir, 'a2a-client', 'packages', 'api-client'),
    task: 'fix imports in api-client'
  },
  {
    name: 'a2a-client/packages/fs-utils',
    path: path.join(rootDir, 'a2a-client', 'packages', 'fs-utils'),
    task: 'fix imports in fs-utils'
  },
  {
    name: 'a2a-client/packages/rag',
    path: path.join(rootDir, 'a2a-client', 'packages', 'rag'),
    task: 'fix imports in rag package'
  },
  {
    name: 'a2a-client/packages/script-runner',
    path: path.join(rootDir, 'a2a-client', 'packages', 'script-runner'),
    task: 'fix imports in script-runner'
  },
  {
    name: 'a2a-client/packages/execution',
    path: path.join(rootDir, 'a2a-client', 'packages', 'execution'),
    task: 'fix imports in execution package'
  },
  {
    name: 'a2a-client/web',
    path: path.join(rootDir, 'a2a-client', 'web'),
    task: 'fix imports in web ui'
  }
];

/**
 * Обработать одну папку
 */
async function processFolder(folder) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Processing: ${folder.name}`);
  console.log(`Path: ${folder.path}`);
  console.log(`${'='.repeat(70)}`);

  const sessionId = `fix-imports-${folder.name.replace(/\//g, '-')}-${Date.now()}`;

  try {
    // Шаг 1: Инициировать действие
    console.log(`\n[1/3] Инициирование действия "${folder.task}"...`);
    const startResult = await actionProcessor.processTaskRequest(sessionId, folder.task);

    if (!startResult.continue) {
      console.log(`✗ Действие не найдено: ${startResult.message}`);
      return { success: false, folder: folder.name, error: 'Action not found' };
    }

    console.log(`✓ Действие найдено: ${startResult.actionId}`);
    console.log(`  Шаг: ${startResult.context?.execution?.step}`);
    console.log(`  Сообщение: ${startResult.message}`);

    // Шаг 2: Запустить все шаги действия
    let currentResult = startResult;
    let stepCount = 0;
    const maxSteps = 50;

    while (currentResult.continue && stepCount < maxSteps) {
      stepCount++;
      const stepName = currentResult.context?.execution?.step || 'unknown';
      console.log(`\n[2/${maxSteps}] Выполнение шага ${stepCount}: ${stepName}`);

      // Отправляем результаты для следующего шага
      const stepInput = {
        rootDir: folder.path,
        dryRun: false
      };

      currentResult = await actionProcessor.processStepResult(
        sessionId,
        stepName,
        stepInput
      );

      if (!currentResult.continue) {
        console.log(`✓ Последний шаг завершен`);
      } else {
        console.log(`  → Прогресс: ${currentResult.context?.tasks?.[0]?.status || 'in_progress'}`);
      }
    }

    if (stepCount >= maxSteps) {
      console.log(`✗ Превышен лимит шагов (${maxSteps})`);
      return { success: false, folder: folder.name, error: 'Max steps exceeded', stepsCompleted: stepCount };
    }

    console.log(`\n[3/3] Итоговый статус: ${currentResult.context?.tasks?.[0]?.status || 'completed'}`);
    console.log(`✓ Папка обработана успешно`);

    return {
      success: true,
      folder: folder.name,
      stepsCompleted: stepCount,
      status: currentResult.context?.tasks?.[0]?.status || 'completed'
    };

  } catch (error) {
    console.error(`\n✗ Ошибка при обработке ${folder.name}:`);
    console.error(`  ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack.split('\n').slice(0, 3).join('\n  ')}`);
    }
    return { success: false, folder: folder.name, error: error.message };
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        Исправление импортов - Прямое выполнение действия            ║');
  console.log('║      (Каждая папка обрабатывается изолировано)                      ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    console.log('\nИнициализация ActionProcessor...');
    await actionProcessor.initialize();
    console.log('✓ ActionProcessor инициализирован');

    const results = [];

    // Обрабатываем каждую папку
    for (const folder of directories) {
      const result = await processFolder(folder);
      results.push(result);
    }

    // Итоговый отчет
    console.log(`\n\n${'='.repeat(70)}`);
    console.log('ИТОГОВЫЙ ОТЧЕТ');
    console.log(`${'='.repeat(70)}`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n✓ Успешно обработано: ${successful.length}/${results.length}`);
    successful.forEach(r => {
      console.log(`  • ${r.folder} (${r.stepsCompleted} шагов)`);
    });

    if (failed.length > 0) {
      console.log(`\n✗ Ошибки при обработке: ${failed.length}/${results.length}`);
      failed.forEach(r => {
        console.log(`  • ${r.folder}: ${r.error}`);
      });
    }

    console.log(`\n${'='.repeat(70)}`);
    process.exit(failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n✗ Критическая ошибка:');
    console.error(error.message);
    process.exit(1);
  }
}

// Запуск
main().catch(console.error);
