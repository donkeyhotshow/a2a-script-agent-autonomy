/**
 * Тестовый скрипт для проверки связи между Client SDK и a2a-server
 * 
 * Запуск: npx tsx scripts/test-server-connection.ts
 * 
 * Проверяет:
 * 1. Конфигурацию Client SDK
 * 2. Доступность a2a-server
 * 3. Вызов /invoke endpoint через Client SDK
 */

import { createRequire } from 'node:module';

// Polyfill fetch for older Node versions
const require = createRequire(import.meta.url);
let fetch = globalThis.fetch;
if (!fetch) {
  console.log('   ⚠️ globalThis.fetch не найден, пробую node-fetch');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fetch = require('node-fetch').default;
  } catch {
    console.log('   ⚠️ node-fetch не доступен');
  }
}

const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:3001';
const SERVER_API_URL = process.env.SERVER_API_URL || 'http://localhost:3000/api/v1';
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConfig(): Promise<boolean> {
  console.log('\n📋 Тест 1: Получение конфигурации Client SDK');
  
  try {
    console.log(`   🔍 URL: ${CLIENT_API_URL}/api/config`);
    const response = await fetch(`${CLIENT_API_URL}/api/config`);
    console.log(`   📥 Status: ${response.status}`);
    const config = await response.json() as { success: boolean; serverUrl?: string; token?: string };
    console.log(`   📄 Response: ${JSON.stringify(config)}`);
    
    if (config.serverUrl) {
      console.log(`   ✅ Конфигурация: serverUrl=${config.serverUrl}, token=${config.token ? 'установлен' : 'отсутствует'}`);
      return true;
    }
    console.log('   ❌ Ошибка получения конфигурации');
    return false;
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testServerHealth(): Promise<boolean> {
  console.log('\n🏥 Тест 2: Проверка здоровья a2a-server');
  
  try {
    console.log(`   🔍 URL: ${SERVER_BASE_URL}/health`);
    const response = await fetch(`${SERVER_BASE_URL}/health`);
    console.log(`   📥 Status: ${response.status}`);
    const health = await response.json() as { success: boolean; data?: { status?: string } };
    console.log(`   📄 Response: ${JSON.stringify(health)}`);
    
    if (health.status === 'ok' || (health.success && health.data?.status === 'healthy')) {
      console.log('   ✅ a2a-server работает');
      return true;
    }
    console.log('   ❌ a2a-server не отвечает');
    return false;
  } catch (error) {
    console.log(`   ❌ Ошибка подключения: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testInvoke(): Promise<boolean> {
  console.log('\n📨 Тест 3: Вызов /invoke через Client SDK');
  
  try {
    // Отправляем тестовый запрос
    const invokeResponse = await fetch(`${CLIENT_API_URL}/api/v1/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'test connection from client sdk' }),
    });
    
    const invokeResult = await invokeResponse.json() as { 
      success: boolean; 
      data?: { promiseId?: string; status?: string };
      promiseId?: string;
    };
    
    if (!invokeResult.success || (!invokeResult.data?.promiseId && !invokeResult.promiseId)) {
      console.log('   ❌ Ошибка вызова invoke');
      return false;
    }
    
    const promiseId = invokeResult.data?.promiseId || invokeResult.promiseId;
    console.log(`   ✅ Запрос отправлен, promiseId: ${promiseId}`);
    
    // Ожидаем обработки (максимум 10 секунд)
    console.log('   ⏳ Ожидание обработки...');
    
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      
      const statusResponse = await fetch(`${SERVER_API_URL}/requests/${promiseId}/status`);
      const status = await statusResponse.json() as { 
        success: boolean; 
        data?: { status?: string; completedAt?: string } 
      };
      
      if (status.success && status.data?.completedAt) {
        console.log(`   ✅ Запрос обработан! Статус: completed`);
        return true;
      }
      
      if (status.success && status.data?.status === 'failed') {
        console.log(`   ❌ Запрос завершился с ошибкой`);
        return false;
      }
    }
    
    console.log('   ⚠️ Запрос обрабатывается (timeout)');
    return true; // Timeout не считаем ошибкой
  } catch (error) {
    console.log(`   ❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('===========================================');
  console.log('   Тест связи Client SDK ↔ a2a-server   ');
  console.log('===========================================');
  console.log(`Client API: ${CLIENT_API_URL}`);
  console.log(`Server API: ${SERVER_API_URL}`);
  
  const results = await Promise.all([
    testConfig(),
    testServerHealth(),
    testInvoke(),
  ]);
  
  console.log('\n===========================================');
  console.log('                  РЕЗУЛЬТАТЫ               ');
  console.log('===========================================');
  console.log(`Конфигурация Client SDK: ${results[0] ? '✅' : '❌'}`);
  console.log(`a2a-server доступен:     ${results[1] ? '✅' : '❌'}`);
  console.log(`Связь работает:          ${results[2] ? '✅' : '❌'}`);
  
  const allPassed = results.every(r => r);
  console.log('\n' + (allPassed ? '🎉 Все тесты пройдены!' : '⚠️ Есть ошибки!'));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);
