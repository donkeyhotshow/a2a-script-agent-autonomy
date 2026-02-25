#!/usr/bin/env tsx

/**
 * Скрипт для сравнения server-response.json с response.json (gold standard)
 * 
 * Использование:
 *   npm run sim:compare <sim-dir>
 *   
 * Пример:
 *   npm run sim:compare fix-vue-imports
 * 
 * Результат:
 *   - Сравнивает server-response.json с response.json
 *   - Выводит различия
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const simDirArg = process.argv[2];

if (!simDirArg) {
  console.error('❌ Usage: npm run sim:compare <sim-dir>');
  console.error('   Example: npm run sim:compare fix-vue-imports');
  process.exit(1);
}

const baseDir = join(__dirname, '..', 'simulations');
const simDir = join(baseDir, simDirArg);

// Глубокое сравнение объектов
function deepCompare(obj1: any, obj2: any, path: string = ''): string[] {
  const differences: string[] = [];
  
  // Получить все ключи
  const keys1 = obj1 ? Object.keys(obj1) : [];
  const keys2 = obj2 ? Object.keys(obj2) : [];
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    
    // Проверяем наличие
    if (!(key in obj1)) {
      differences.push(`${currentPath}: отсутствует в server-response (есть в gold standard)`);
      continue;
    }
    if (!(key in obj2)) {
      differences.push(`${currentPath}: есть в server-response (отсутствует в gold standard)`);
      continue;
    }
    
    // Сравниваем значения
    if (typeof val1 !== typeof val2) {
      differences.push(`${currentPath}: ${JSON.stringify(val1)} (${typeof val1}) ≠ ${JSON.stringify(val2)} (${typeof val2})`);
      continue;
    }
    
    // Рекурсивное сравнение для объектов и массивов
    if (val1 && typeof val1 === 'object' && val2 && typeof val2 === 'object') {
      if (Array.isArray(val1) !== Array.isArray(val2)) {
        differences.push(`${currentPath}: массив ≠ объект`);
        continue;
      }
      
      const nestedDiffs = deepCompare(val1, val2, currentPath);
      differences.push(...nestedDiffs);
    } else if (val1 !== val2) {
      // Для примитивов - простое сравнение
      // Игнорируем sessionId и временные метки
      const ignoreList = ['sessionId', 'createdAt', 'startedAt', 'completedAt', 'promiseId', 'id'];
      if (!ignoreList.includes(key)) {
        differences.push(`${currentPath}: ${JSON.stringify(val1)} ≠ ${JSON.stringify(val2)}`);
      }
    }
  }
  
  return differences;
}

// Основная логика
function main() {
  const goldStandardPath = join(simDir, 'response.json');
  const serverResponsePath = join(simDir, 'server-response.json');
  
  console.log(`\n📁 Сравнение симуляции: ${simDirArg}`);
  console.log(`   Path: ${simDir}`);
  
  // Проверка существования директории
  if (!existsSync(simDir)) {
    console.error(`❌ Симуляция не найдена: ${simDir}`);
    process.exit(1);
  }
  
  // Проверка существования файлов
  if (!existsSync(goldStandardPath)) {
    console.error(`❌ gold standard (response.json) не найден: ${goldStandardPath}`);
    process.exit(1);
  }
  
  if (!existsSync(serverResponsePath)) {
    console.error(`❌ server-response.json не найден`);
    console.error(`   Сначала запустите симуляцию: npm run sim:run ${simDirArg}`);
    process.exit(1);
  }
  
  // Читаем файлы
  let goldStandard: any;
  let serverResponse: any;
  
  try {
    goldStandard = JSON.parse(readFileSync(goldStandardPath, 'utf-8'));
    console.log('✅ Gold standard прочитан');
  } catch (err: any) {
    console.error(`❌ Ошибка чтения gold standard: ${err.message}`);
    process.exit(1);
  }
  
  try {
    serverResponse = JSON.parse(readFileSync(serverResponsePath, 'utf-8'));
    console.log('✅ server-response.json прочитан');
  } catch (err: any) {
    console.error(`❌ Ошибка чтения server-response: ${err.message}`);
    process.exit(1);
  }
  
  // Сравниваем
  console.log('\n⏳ Сравнение...');
  
  // Извлекаем данные из serverResponse.data для сравнения
  const serverData = serverResponse.data || serverResponse;
  const goldData = goldStandard;
  
  const differences = deepCompare(serverData, goldData);
  
  if (differences.length === 0) {
    console.log('\n✅ Gold standard совпадает полностью!');
    process.exit(0);
  } else {
    console.log(`\n🔴 Найдено ${differences.length} различий:\n`);
    
    // Группируем различия
    const mismatches: string[] = [];
    const missing: string[] = [];
    const extra: string[] = [];
    
    differences.forEach(diff => {
      if (diff.includes('отсутствует')) {
        missing.push(diff);
      } else if (diff.includes('есть в server-response')) {
        extra.push(diff);
      } else {
        mismatches.push(diff);
      }
    });
    
    if (mismatches.length > 0) {
      console.log('🔴 Различия в значениях:');
      mismatches.forEach(diff => console.log(`   - ${diff}`));
      console.log('');
    }
    
    if (missing.length > 0) {
      console.log('🟡 Отсутствует в server-response:');
      missing.forEach(diff => console.log(`   - ${diff}`));
      console.log('');
    }
    
    if (extra.length > 0) {
      console.log('🟢 Дополнительные поля в server-response:');
      extra.forEach(diff => console.log(`   - ${diff}`));
      console.log('');
    }
    
    process.exit(1);
  }
}

main();
