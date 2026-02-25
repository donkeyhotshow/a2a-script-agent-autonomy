#!/usr/bin/env node
'use strict';

/**
 * Unit‑тесты для core‑логики истории TerminalHandler.
 *
 * Тестируются чистые функции:
 * - shouldPersistHistoryCore
 * - checkHistoryLimitCore
 *
 * Они не зависят от @libs/* и могут безопасно выполняться в этом репо.
 */

const {
  shouldPersistHistoryCore,
  checkHistoryLimitCore
} = require('../../handlers/terminal-handler-core.cjs');

function logOk(message) {
  // eslint-disable-next-line no-console
  console.log(`✅ ${message}`);
}

function logFail(message, error) {
  // eslint-disable-next-line no-console
  console.error(`❌ ${message}`);
  if (error) {
    // eslint-disable-next-line no-console
    console.error(error.stack || error.message || String(error));
  }
}

function testShouldPersistHistoryCore() {
  try {
    const baseConfig = {
      history: {
        enabled: true,
        restrictToInitialCwd: false
      }
    };

    // История включена, ограничений по initialCwd нет
    if (!shouldPersistHistoryCore(baseConfig, 'C:\\proj', 'C:\\other')) {
      throw new Error('Ожидалось, что история будет сохраняться при enabled=true без ограничений');
    }

    // История отключена
    const disabledConfig = {
      history: {
        enabled: false
      }
    };

    if (shouldPersistHistoryCore(disabledConfig, 'C:\\proj', 'C:\\proj')) {
      throw new Error('Ожидалось, что история не будет сохраняться при enabled=false');
    }

    // Ограничение по initialCwd включено, currentCwd совпадает
    const restrictedConfig = {
      history: {
        enabled: true,
        restrictToInitialCwd: true
      }
    };

    if (!shouldPersistHistoryCore(restrictedConfig, 'C:\\proj', 'C:\\proj')) {
      throw new Error(
        'Ожидалось, что история будет сохраняться, если currentCwd совпадает с initialCwd'
      );
    }

    // Ограничение по initialCwd включено, currentCwd другой
    if (shouldPersistHistoryCore(restrictedConfig, 'C:\\proj', 'C:\\other')) {
      throw new Error(
        'Ожидалось, что история не будет сохраняться, если currentCwd отличается от initialCwd'
      );
    }

    logOk('shouldPersistHistoryCore корректно обрабатывает основные конфигурации');
  } catch (error) {
    logFail('Ошибка в тестах shouldPersistHistoryCore', error);
    process.exitCode = 1;
  }
}

function testCheckHistoryLimitCore() {
  try {
    const defaultConfig = {
      history: {}
    };

    // По умолчанию maxItems = 1000
    if (!checkHistoryLimitCore(defaultConfig, 999)) {
      throw new Error('Ожидалось, что при currentCount=999 лимит ещё не достигнут (max=1000)');
    }

    if (checkHistoryLimitCore(defaultConfig, 1000)) {
      throw new Error('Ожидалось, что при currentCount=1000 лимит достигнут (max=1000)');
    }

    // Пользовательский maxItems
    const customConfig = {
      history: {
        maxItems: 10
      }
    };

    if (!checkHistoryLimitCore(customConfig, 9)) {
      throw new Error('Ожидалось, что при currentCount=9 лимит ещё не достигнут (max=10)');
    }

    if (checkHistoryLimitCore(customConfig, 10)) {
      throw new Error('Ожидалось, что при currentCount=10 лимит достигнут (max=10)');
    }

    logOk('checkHistoryLimitCore корректно учитывает maxItems и currentCount');
  } catch (error) {
    logFail('Ошибка в тестах checkHistoryLimitCore', error);
    process.exitCode = 1;
  }
}

function main() {
  testShouldPersistHistoryCore();
  testCheckHistoryLimitCore();
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    logFail('Фатальная ошибка в тестах core‑логики истории TerminalHandler', error);
    process.exit(1);
  }
}


