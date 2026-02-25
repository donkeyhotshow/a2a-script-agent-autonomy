#!/usr/bin/env node
'use strict';

/**
 * Обёртка над тестом глобальной истории для интеграции с локальным раннером tests/
 *
 * По сути просто переиспользует существующий сценарий `test-global-history.cjs`,
 * чтобы он был виден как часть структуры `tests/history/*`.
 */

const path = require('path');

function logFail(message, error) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(error.message || String(error));
  }
}

async function main() {
  try {
    const scriptPath = path.resolve(__dirname, '..', '..', 'test-global-history.cjs');
    // Запускаем исходный скрипт как дочерний процесс, чтобы сохранить его поведение 1:1
    // (используем require('child_process') только здесь, чтобы не ломать оригинальный файл).
    const { execFileSync } = require('child_process');
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..', '..'),
      stdio: 'inherit'
    });
  } catch (error) {
    logFail('global-history-structure.test.cjs: сценарий глобальной истории завершился ошибкой', error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}


