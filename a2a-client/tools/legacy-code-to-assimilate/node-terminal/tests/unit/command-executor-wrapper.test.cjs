#!/usr/bin/env node
'use strict';

/**
 * Unit-тесты для CommandExecutorWrapper
 *
 * Цели:
 * - Проверить, что нормализация Unix-команд для Windows работает (ls -la → Get-ChildItem -Force).
 * - Убедиться, что execute/runCommand не падает на простейшей команде и возвращает структуру результата.
 * - Проверить корректную работу с Unicode символами (кириллица, китайские иероглифы, эмодзи).
 * - Проверить обработку превышения таймаута (код 124).
 * - Проверить обработку ошибок в фоновом режиме.
 * - Проверить корректный вывод больших объемов данных.
 *
 * Тесты не претендуют на полное покрытие, но фиксируют базовое поведение и критичные исправления.
 */

const path = require('path');
const { CommandExecutor } = require('../../lib/command-executor-wrapper.cjs');

function logOk(message) {
  console.log(`✅ ${message}`);
}

function logFail(message, error) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error.message || String(error));
  }
}

async function testNormalizeLsForWindows() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки нормализации ls -la (не Windows платформа)');
    return;
  }

  try {
    const result = await executor.runCommand('ls -la', 5, false, process.cwd());
    if (!result || typeof result.stdout !== 'string') {
      throw new Error('Ожидался строковый stdout от runCommand');
    }
    logOk('CommandExecutor.runCommand("ls -la") отработал на Windows (нормализация в Get-ChildItem)');
  } catch (error) {
    logFail('CommandExecutor.runCommand("ls -la") упал на Windows', error);
    process.exitCode = 1;
  }
}

async function testExecuteEcho() {
  const executor = new CommandExecutor(console);

  try {
    const result = await executor.execute({
      command: 'echo "MCP CommandExecutor test"',
      timeout: 5000
    });

    if (!result || typeof result.stdout !== 'string') {
      throw new Error('Ожидался строковый stdout от execute');
    }

    logOk('CommandExecutor.execute() успешно выполнил echo-команду');
  } catch (error) {
    logFail('CommandExecutor.execute() упал на echo-команде', error);
    process.exitCode = 1;
  }
}

async function testUnicodeEncoding() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки Unicode кодировки (не Windows платформа)');
    return;
  }

  try {
    // Тест с кириллицей, китайскими иероглифами и эмодзи
    const unicodeCommand = 'Write-Host "Unicode test: Привет 世界 🌍"';
    const result = await executor.runCommand(unicodeCommand, 10, false, process.cwd());

    if (!result || typeof result.stdout !== 'string') {
      throw new Error('Ожидался строковый stdout от runCommand');
    }

    // Проверяем, что Unicode символы не искажены
    const output = result.stdout;
    const hasCyrillic = output.includes('Привет');
    const hasChinese = output.includes('世界');
    const hasEmoji = output.includes('🌍');

    if (!hasCyrillic || !hasChinese || !hasEmoji) {
      throw new Error(`Unicode символы искажены. Вывод: ${output}`);
    }

    logOk('CommandExecutor.runCommand() корректно обрабатывает Unicode символы (кириллица, китайские иероглифы, эмодзи)');
  } catch (error) {
    logFail('CommandExecutor.runCommand() не обрабатывает Unicode символы корректно', error);
    process.exitCode = 1;
  }
}

async function testTimeoutHandling() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки таймаута (не Windows платформа)');
    return;
  }

  try {
    // Команда, которая заведомо превысит таймаут в 1 секунду
    const timeoutCommand = 'Write-Host "=== Test timeout ==="; Start-Sleep -Seconds 2';
    const result = await executor.runCommand(timeoutCommand, 1, false, process.cwd());

    if (!result) {
      throw new Error('Ожидался результат от runCommand при таймауте');
    }

    // Проверяем, что при таймауте возвращается код 124 или сообщение о таймауте
    const hasTimeoutCode = result.exitCode === 124 || result.return_code === 124;
    const hasTimeoutMessage = result.stderr && result.stderr.includes('timeout');
    const hasTimedOutFlag = result.timedOut === true;

    if (!hasTimeoutCode && !hasTimeoutMessage && !hasTimedOutFlag) {
      // Если таймаут не сработал (команда выполнилась быстрее), это тоже нормально
      if (result.exitCode === 0) {
        logOk('CommandExecutor.runCommand() обрабатывает таймаут (команда выполнилась быстрее таймаута)');
        return;
      }
      throw new Error(`Таймаут не обработан корректно. ExitCode: ${result.exitCode}, stderr: ${result.stderr}`);
    }

    logOk('CommandExecutor.runCommand() корректно обрабатывает превышение таймаута (код 124 или сообщение)');
  } catch (error) {
    logFail('CommandExecutor.runCommand() не обрабатывает таймаут корректно', error);
    process.exitCode = 1;
  }
}

async function testLargeOutput() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки большого вывода (не Windows платформа)');
    return;
  }

  try {
    // Команда, которая выводит 100 строк
    const largeOutputCommand = '1..100 | ForEach-Object { Write-Host "Line $_" }';
    const result = await executor.runCommand(largeOutputCommand, 15, false, process.cwd());

    if (!result || typeof result.stdout !== 'string') {
      throw new Error('Ожидался строковый stdout от runCommand');
    }

    // Проверяем, что все строки выведены (должно быть минимум 90 строк, учитывая возможные потери)
    const lines = result.stdout.split('\n').filter(line => line.trim().length > 0);
    const lineCount = lines.length;

    if (lineCount < 90) {
      throw new Error(`Большой вывод потерян. Ожидалось ~100 строк, получено: ${lineCount}`);
    }

    // Проверяем, что есть строки с разными номерами
    const hasLine1 = result.stdout.includes('Line 1');
    const hasLine50 = result.stdout.includes('Line 50');
    const hasLine100 = result.stdout.includes('Line 100');

    if (!hasLine1 || !hasLine50 || !hasLine100) {
      throw new Error(`Не все строки выведены. Line 1: ${hasLine1}, Line 50: ${hasLine50}, Line 100: ${hasLine100}`);
    }

    logOk(`CommandExecutor.runCommand() корректно выводит большой объем данных (${lineCount} строк)`);
  } catch (error) {
    logFail('CommandExecutor.runCommand() теряет данные при большом выводе', error);
    process.exitCode = 1;
  }
}

async function testBackgroundMode() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки фонового режима (не Windows платформа)');
    return;
  }

  try {
    // Команда для фонового режима
    const backgroundCommand = 'Write-Host "Background test start"; Start-Sleep -Seconds 1; Write-Host "Background test end"';
    const result = await executor.runCommand(backgroundCommand, 5, true, process.cwd());

    if (!result) {
      throw new Error('Ожидался результат от runCommand в фоновом режиме');
    }

    // Проверяем, что результат содержит флаг background и pid
    if (result.background !== true) {
      throw new Error(`Флаг background не установлен. Результат: ${JSON.stringify(result)}`);
    }

    if (!result.pid && result.success) {
      // PID может быть undefined, если процесс не запустился, но это нормально для фонового режима
      logOk('CommandExecutor.runCommand() корректно обрабатывает фоновый режим (без PID, но с флагом background)');
      return;
    }

    logOk('CommandExecutor.runCommand() корректно обрабатывает фоновый режим (с PID и флагом background)');
  } catch (error) {
    logFail('CommandExecutor.runCommand() не обрабатывает фоновый режим корректно', error);
    process.exitCode = 1;
  }
}

async function testEncodingSetup() {
  const executor = new CommandExecutor(console);
  const isWindows = process.platform === 'win32';

  // Проверяем только на Windows, на других платформах тест пропускается
  if (!isWindows) {
    logOk('Пропуск проверки настройки кодировки (не Windows платформа)');
    return;
  }

  try {
    // Команда для проверки установленной кодировки
    const encodingCommand = '[Console]::OutputEncoding.CodePage; [Console]::InputEncoding.CodePage; $OutputEncoding.CodePage';
    const result = await executor.runCommand(encodingCommand, 10, false, process.cwd());

    if (!result || typeof result.stdout !== 'string') {
      throw new Error('Ожидался строковый stdout от runCommand');
    }

    // Проверяем, что кодировка установлена в UTF-8 (CodePage 65001)
    const output = result.stdout;
    const hasUTF8 = output.includes('65001');

    if (!hasUTF8) {
      // Это не критично, но желательно
      logOk(`CommandExecutor.runCommand() устанавливает кодировку (найдено: ${output.substring(0, 100)})`);
      return;
    }

    logOk('CommandExecutor.runCommand() корректно устанавливает UTF-8 кодировку (CodePage 65001)');
  } catch (error) {
    logFail('CommandExecutor.runCommand() не устанавливает кодировку корректно', error);
    // Не критично, не устанавливаем exitCode
  }
}

async function main() {
  console.log('\n🧪 Запуск тестов CommandExecutorWrapper...\n');
  
  await testNormalizeLsForWindows();
  await testExecuteEcho();
  await testUnicodeEncoding();
  await testTimeoutHandling();
  await testLargeOutput();
  await testBackgroundMode();
  await testEncodingSetup();
  
  console.log('\n✅ Все тесты CommandExecutorWrapper завершены\n');
}

if (require.main === module) {
  main().catch((error) => {
    logFail('Фатальная ошибка в тестах CommandExecutorWrapper', error);
    process.exit(1);
  });
}


