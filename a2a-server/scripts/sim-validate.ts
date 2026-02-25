#!/usr/bin/env tsx

/**
 * Скрипт для валидации симуляции по схеме
 * 
 * Использование:
 *   npm run sim:validate <sim-dir>
 *   
 * Пример:
 *   npm run sim:validate fix-vue-imports
 * 
 * Результат:
 *   - Проверяет server-response.json по схеме
 *   - Выводит результаты валидации
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const simDirArg = process.argv[2];

if (!simDirArg) {
  console.error('❌ Usage: npm run sim:validate <sim-dir>');
  console.error('   Example: npm run sim:validate fix-vue-imports');
  process.exit(1);
}

const baseDir = join(__dirname, '..', 'simulations');
const simDir = join(baseDir, simDirArg);

// Типы схем для валидации
type ResponseType = 
  | 'action_proposal'
  | 'action_executing'
  | 'action_complete'
  | 'error';

// Базовая схема ответа
interface ResponseSchema {
  sessionId?: string;
  response: {
    type: ResponseType;
    proposedActions?: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
    execution?: {
      history: any[];
      executingAction: any;
      currentStep: number;
    };
  };
  nextSteps?: Array<{
    type: string;
    description?: string;
  }>;
}

// Функция валидации
function validateResponse(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Проверка на валидный JSON
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Ответ не является объектом'] };
  }
  
  // Проверка sessionId
  if (!data.sessionId) {
    errors.push('Отсутствует sessionId');
  }
  
  // Проверка response
  if (!data.response) {
    errors.push('Отсутствует поле response');
  } else {
    const response = data.response;
    
    // Проверка type
    if (!response.type) {
      errors.push('Отсутствует response.type');
    } else {
      const validTypes = ['action_proposal', 'action_executing', 'action_complete', 'error'];
      if (!validTypes.includes(response.type)) {
        errors.push(`Неверный тип: ${response.type}. Ожидается: ${validTypes.join(' | ')}`);
      }
    }
    
    // Для action_proposal проверяем proposedActions
    if (response.type === 'action_proposal') {
      if (!response.proposedActions) {
        errors.push('action_proposal требует proposedActions');
      } else if (!Array.isArray(response.proposedActions)) {
        errors.push('proposedActions должен быть массивом');
      } else if (response.proposedActions.length === 0) {
        errors.push('proposedActions не должен быть пустым');
      }
    }
    
    // Для action_executing проверяем execution
    if (response.type === 'action_executing') {
      if (!response.execution) {
        errors.push('action_executing требует execution');
      } else {
        if (!Array.isArray(response.execution.history)) {
          errors.push('execution.history должен быть массивом');
        }
        if (typeof response.execution.currentStep !== 'number') {
          errors.push('execution.currentStep должен быть числом');
        }
      }
    }
  }
  
  // Проверка nextSteps
  if (!data.nextSteps) {
    errors.push('Отсутствует поле nextSteps');
  } else if (!Array.isArray(data.nextSteps)) {
    errors.push('nextSteps должен быть массивом');
  }
  
  return { valid: errors.length === 0, errors };
}

// Основная логика
function main() {
  const responsePath = join(simDir, 'server-response.json');
  
  console.log(`\n📁 Валидация симуляции: ${simDirArg}`);
  console.log(`   Path: ${simDir}`);
  
  // Проверка существования директории
  if (!existsSync(simDir)) {
    console.error(`❌ Симуляция не найдена: ${simDir}`);
    process.exit(1);
  }
  
  // Проверка существования server-response.json
  if (!existsSync(responsePath)) {
    console.error(`❌ server-response.json не найден`);
    console.error(`   Сначала запустите симуляцию: npm run sim:run ${simDirArg}`);
    process.exit(1);
  }
  
  // Читаем server-response.json
  let responseData: any;
  try {
    const content = readFileSync(responsePath, 'utf-8');
    responseData = JSON.parse(content);
    console.log('✅ server-response.json прочитан');
  } catch (err: any) {
    console.error(`❌ Ошибка чтения JSON: ${err.message}`);
    process.exit(1);
  }
  
  // Валидируем
  console.log('\n⏳ Валидация...');
  const result = validateResponse(responseData);
  
  if (result.valid) {
    console.log('✅ Валидация пройдена');
    console.log(`   Тип ответа: ${responseData.response?.type}`);
    console.log(`   sessionId: ${responseData.sessionId}`);
    process.exit(0);
  } else {
    console.log('❌ Валидация провалена\n');
    console.log('Ошибки:');
    result.errors.forEach(err => {
      console.log(`   - ${err}`);
    });
    process.exit(1);
  }
}

main();
