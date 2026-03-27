#!/usr/bin/env node
/**
 * E2E Dialog Test - проверяет полную цепочку диалога с несколькими вводами
 * 
 * Запускать: node scripts/direct-tests/e2e-dialog-test.js
 */

const SERVER_URL = process.env.A2A_SERVER_URL || 'http://localhost:3000';
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function createSession() {
  console.log('\n📋 Создание сессии...');
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `test_${Date.now()}`,
      context: { execution: { action: 'dialog', step: 'init' } }
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }
  
  const session = await response.json();
  const sessionId = session.session?.id || session.id || session.sessionId || session.ID;
  console.log('✅ Сессия создана:', sessionId);
  return sessionId;
}

async function sendMessage(sessionId, message, step = 'message') {
  console.log(`\n📤 Отправка сообщения: "${message}"`);
  
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result: {
        message: message
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('📥 Ответ сервера:', JSON.stringify(result, null, 2));
  return result;
}

async function getSession(sessionId) {
  const response = await fetch(`${CLIENT_API_URL}/api/a2a/sessions/${sessionId}`);
  if (!response.ok) {
    throw new Error(`Failed to get session: ${response.status}`);
  }
  return response.json();
}

async function invokeDirect(task, context = {}) {
  console.log(`\n🔧 Прямой вызов invoke: "${task}"`);
  
  // Для первого запроса - только task (без context)
  // Для последующих - context с task и execution
  const body = {
    task: task,
    sync: true
  };
  
  // Добавляем context только если есть данные
  if (context.execution) {
    body.context = {
      task: task,
      execution: context.execution
    };
  }
  
  const response = await fetch(`${SERVER_URL}/api/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Invoke failed: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('📥 Ответ invoke:', JSON.stringify(result, null, 2));
  return result;
}

async function runE2ETest() {
  console.log('='.repeat(60));
  console.log('🔬 E2E Dialog Test - Начало');
  console.log('='.repeat(60));
  
  try {
    // Тест 1: Прямой вызов invoke
    console.log('\n--- Тест 1: Прямой вызов invoke ---');
    const invokeResult = await invokeDirect('Привет');
    
    if (invokeResult.success && invokeResult.data) {
      console.log('✅ Invoke выполнен успешно');
      
      // Проверяем, есть ли form или promiseId
      if (invokeResult.data.execute?.form) {
        console.log('📋 Получена форма:', invokeResult.data.execute.form.title);
      }
      if (invokeResult.data.promiseId) {
        console.log('📋 Promise ID:', invokeResult.data.promiseId);
      }
    } else {
      console.log('❌ Invoke вернул ошибку');
    }
    
    // Тест 2: Через Client API
    console.log('\n--- Тест 2: Через Client API ---');
    const sessionId = await createSession();
    
    // Шаг 1: Начальное сообщение
    const result1 = await sendMessage(sessionId, 'Привет');
    
    // Небольшая пауза для обработки
    await sleep(1000);
    
    // Получаем обновленную сессию
    const session = await getSession(sessionId);
    console.log('\n📊 Состояние сессии:');
    console.log('  - Текущий шаг:', session.context?.execution?.step);
    console.log('  - История:', session.context?.history?.length || 0, 'записей');
    
    // Проверяем, есть ли execute
    if (session.execute?.form) {
      console.log('  - Форма:', session.execute.form.title);
      console.log('  - Поля формы:', session.execute.form.inputs?.map(i => i.id).join(', '));
    }
    
    // Шаг 2: Отправка следующего сообщения (если есть форма)
    if (session.execute?.form) {
      const result2 = await sendMessage(sessionId, 'Тестовое сообщение', 'respond');
      await sleep(1000);
      
      const session2 = await getSession(sessionId);
      console.log('\n📊 Состояние после второго сообщения:');
      console.log('  - Текущий шаг:', session2.context?.execution?.step);
      console.log('  - История:', session2.context?.history?.length || 0, 'записей');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ E2E тест завершен успешно');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Ошибка E2E теста:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runE2ETest();
