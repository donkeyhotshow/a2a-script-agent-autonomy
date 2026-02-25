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
 *   - Сохраняет ответ в server-response.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// Найти все директории симуляций
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
        }
      }
    }
  } catch (err: any) {
    console.error(`Error reading directory: ${err.message}`);
  }
  
  return dirs.sort();
}

// Запустить одну симуляцию
async function runSingleSimulation(simDir: string): Promise<boolean> {
  const requestPath = join(simDir, 'request.json');
  const responsePath = join(simDir, 'server-response.json');
  const simName = simDir.split(/[/\\]/).pop() || simDir;
  
  console.log(`\n📁 Simulation: ${simName}`);
  console.log(`   Path: ${simDir}`);

  // Читаем request.json
  let requestData: any;
  try {
    const requestContent = readFileSync(requestPath, 'utf-8');
    requestData = JSON.parse(requestContent);
  } catch (err: any) {
    console.error(`❌ Error reading request.json: ${err.message}`);
    return false;
  }

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

  console.log(`   Action: ${requestData.action || 'N/A'}`);
  console.log(`   Task: ${message}`);

  // Вызываем сервер
  try {
    const { invoke } = await import('../src/services/invoke.service.js');
    const { requestService } = await import('../src/services/request.service.js');
    
    console.log('\n⏳ Invoking server...');
    
    const invokeInput: any = {
      context: context,
    };
    
    if (requestData.task) {
      invokeInput.task = requestData.task;
    } else if (requestData.message) {
      invokeInput.message = requestData.message;
    }
    
    if (requestData.action) {
      invokeInput.action = requestData.action;
    }
    
    if (requestData.selectedAction) {
      invokeInput.selectedAction = requestData.selectedAction;
    }
    
    if (requestData.stepId) {
      invokeInput.stepId = requestData.stepId;
      invokeInput.stepResult = requestData.result;
    }
    
    const { promiseId } = await invoke('simulation-client', invokeInput);
    
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
      return false;
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
    console.log(`\n✅ Response saved to: server-response.json`);
    console.log(`   Outcome: ${result.result?.['outcome'] || 'N/A'}`);
    
    return true;
    
  } catch (err: any) {
    console.error(`\n❌ Error: ${err.message}`);
    return false;
  }
}

// Основная логика
async function main() {
  const baseDir = join(__dirname, '..', 'simulations');
  
  if (isAll) {
    // Запустить все симуляции
    console.log('\n🔄 Running all simulations...\n');
    
    const simDirs = findSimulationDirs(baseDir);
    
    if (simDirs.length === 0) {
      console.error('❌ No simulations found');
      process.exit(1);
    }
    
    console.log(`📊 Found ${simDirs.length} simulations:\n`);
    simDirs.forEach((dir, i) => {
      console.log(`   ${i + 1}. ${dir.split(/[/\\]/).pop()}`);
    });
    console.log('');
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < simDirs.length; i++) {
      const simDir = simDirs[i];
      const simName = simDir.split(/[/\\]/).pop() || simDir;
      
      console.log(`\n[${i + 1}/${simDirs.length}] ${'='.repeat(40)}`);
      
      const success = await runSingleSimulation(simDir);
      
      if (success) {
        successCount++;
        console.log(`\n✅ ${simName}: Пройдено`);
      } else {
        failCount++;
        console.log(`\n❌ ${simName}: Провалено`);
      }
      
      // Небольшая пауза между симуляциями
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(`📈 ИТОГО: ${successCount}/${simDirs.length} пройдено`);
    console.log(`   ✅ Успешно: ${successCount}`);
    console.log(`   ❌ Провалено: ${failCount}`);
    console.log('='.repeat(50) + '\n');
    
  } else {
    // Запустить одну симуляцию
    const simDir = join(baseDir, simDirArg!);
    
    if (!existsSync(simDir)) {
      console.error(`❌ Simulation not found: ${simDir}`);
      console.error(`   Available simulations:`);
      
      const simDirs = findSimulationDirs(baseDir);
      simDirs.forEach(dir => {
        console.log(`   - ${dir.split(/[/\\]/).pop()}`);
      });
      process.exit(1);
    }
    
    const success = await runSingleSimulation(simDir);
    
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
