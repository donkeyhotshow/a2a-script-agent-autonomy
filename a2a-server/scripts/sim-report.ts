#!/usr/bin/env tsx

/**
 * Скрипт для генерации отчета по всем симуляциям
 * 
 * Использование:
 *   npm run sim:report
 * 
 * Результат:
 *   - Сканирует все симуляции
 *   - Генерирует сводный отчет
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Информация о симуляции
interface SimulationInfo {
  name: string;
  path: string;
  hasRequest: boolean;
  hasResponse: boolean;
  hasServerResponse: boolean;
  hasNotes: boolean;
  serverResponse?: any;
  validationErrors?: string[];
  goldStandardMatch?: boolean;
}

// Валидация одной симуляции
function validateSimulation(simDir: string, name: string): SimulationInfo {
  const info: SimulationInfo = {
    name,
    path: simDir,
    hasRequest: existsSync(join(simDir, 'request.json')),
    hasResponse: existsSync(join(simDir, 'response.json')),
    hasServerResponse: existsSync(join(simDir, 'server-response.json')),
    hasNotes: existsSync(join(simDir, 'NOTES.md'))
  };
  
  // Читаем server-response.json если есть
  if (info.hasServerResponse) {
    try {
      const content = readFileSync(join(simDir, 'server-response.json'), 'utf-8');
      info.serverResponse = JSON.parse(content);
      
      // Базовая валидация
      const errors: string[] = [];
      if (!info.serverResponse?.response?.type) {
        errors.push('Отсутствует response.type');
      }
      if (!info.serverResponse?.sessionId) {
        errors.push('Отсутствует sessionId');
      }
      if (!info.serverResponse?.nextSteps) {
        errors.push('Отсутствует nextSteps');
      }
      info.validationErrors = errors;
      
    } catch (err: any) {
      info.validationErrors = [`Ошибка чтения: ${err.message}`];
    }
  }
  
  // Сравниваем с gold standard если есть оба файла
  if (info.hasResponse && info.hasServerResponse) {
    try {
      const goldStandard = JSON.parse(readFileSync(join(simDir, 'response.json'), 'utf-8'));
      const serverResponse = JSON.parse(readFileSync(join(simDir, 'server-response.json'), 'utf-8'));
      
      // Простое сравнение ключей
      const goldKeys = Object.keys(goldStandard.response || {});
      const serverKeys = Object.keys(serverResponse.data?.response || serverResponse.response || {});
      
      // Проверяем совпадение типа
      const goldType = goldStandard.response?.type;
      const serverType = serverResponse.data?.response?.type || serverResponse.response?.type;
      
      info.goldStandardMatch = goldType === serverType;
      
    } catch (err: any) {
      info.goldStandardMatch = undefined;
    }
  }
  
  return info;
}

// Найти все симуляции
function findSimulations(baseDir: string): SimulationInfo[] {
  const simulations: SimulationInfo[] = [];
  
  try {
    const entries = readdirSync(baseDir);
    
    for (const entry of entries) {
      const fullPath = join(baseDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        const requestPath = join(fullPath, 'request.json');
        if (existsSync(requestPath)) {
          const info = validateSimulation(fullPath, entry);
          simulations.push(info);
        }
      }
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  }
  
  return simulations.sort((a, b) => a.name.localeCompare(b.name));
}

// Определить статус
function getStatus(info: SimulationInfo): { status: string; emoji: string; color: string } {
  if (!info.hasServerResponse) {
    return { status: 'NOT RUN', emoji: '⚪', color: 'gray' };
  }
  
  if (info.validationErrors && info.validationErrors.length > 0) {
    return { status: 'FAILED', emoji: '🔴', color: 'red' };
  }
  
  if (info.goldStandardMatch === false) {
    return { status: 'PARTIAL', emoji: '🟡', color: 'yellow' };
  }
  
  return { status: 'PASSED', emoji: '✅', color: 'green' };
}

// Основная логика
function main() {
  const baseDir = join(__dirname, '..', 'simulations');
  
  console.log('\n' + '='.repeat(50));
  console.log('ОТЧЕТ ПО СИМУЛЯЦИЯМ');
  console.log(`Дата: ${new Date().toISOString().split('T')[0]}`);
  console.log('='.repeat(50));
  
  // Проверка существования директории
  if (!existsSync(baseDir)) {
    console.error(`\n❌ Директория симуляций не найдена: ${baseDir}`);
    console.log('   Создайте первую симуляцию: npm run sim:create <action-name>');
    process.exit(1);
  }
  
  // Сканируем симуляции
  console.log('\n📊 Сканирование симуляций...\n');
  const simulations = findSimulations(baseDir);
  
  if (simulations.length === 0) {
    console.log('Симуляции не найдены.');
    console.log('Создайте первую симуляцию: npm run sim:create <action-name>');
    process.exit(0);
  }
  
  console.log(`Найдено симуляций: ${simulations.length}\n`);
  
  // Выводим информацию о каждой симуляции
  let passed = 0;
  let partial = 0;
  let failed = 0;
  let notRun = 0;
  
  for (const sim of simulations) {
    const statusInfo = getStatus(sim);
    
    if (statusInfo.status === 'PASSED') passed++;
    else if (statusInfo.status === 'PARTIAL') partial++;
    else if (statusInfo.status === 'FAILED') failed++;
    else notRun++;
    
    console.log(`Симуляция: ${sim.name}`);
    console.log(`  ${statusInfo.emoji} Статус: ${statusInfo.status}`);
    
    if (sim.hasServerResponse) {
      const responseType = sim.serverResponse?.data?.response?.type || sim.serverResponse?.response?.type || 'unknown';
      console.log(`  📝 Тип ответа: ${responseType}`);
      
      if (sim.validationErrors && sim.validationErrors.length > 0) {
        console.log(`  ❌ Ошибки валидации:`);
        sim.validationErrors.forEach(err => console.log(`     - ${err}`));
      }
      
      if (sim.goldStandardMatch === false) {
        console.log(`  ⚠️ Gold Standard: отличается`);
      } else if (sim.goldStandardMatch === true) {
        console.log(`  ✅ Gold Standard: совпадает`);
      }
    } else {
      console.log(`  ⏳ Не запущена (запустите: npm run sim:run ${sim.name})`);
    }
    
    console.log('');
  }
  
  // Итоги
  const total = simulations.length;
  const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  console.log('='.repeat(50));
  console.log('ИТОГО:');
  console.log(`   ✅ Пройдено: ${passed}/${total} (${successRate}%)`);
  if (partial > 0) console.log(`   🟡 Частично: ${partial}`);
  if (failed > 0) console.log(`   ❌ Провалено: ${failed}`);
  if (notRun > 0) console.log(`   ⚪ Не запущено: ${notRun}`);
  console.log('='.repeat(50));
  
  // Рекомендации
  console.log('\n📋 Рекомендации:');
  
  if (notRun > 0) {
    console.log(`   - Запустите ${notRun} не запущенных симуляций`);
  }
  if (failed > 0) {
    console.log(`   - Исправьте ${failed} проваленных симуляций`);
  }
  if (passed === total && total > 0) {
    console.log('   🎉 Все симуляции пройдены!');
  }
  
  console.log('');
}

main();
