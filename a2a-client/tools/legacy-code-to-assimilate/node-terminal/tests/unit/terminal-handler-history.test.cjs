#!/usr/bin/env node
'use strict';

/**
 * Базовые unit‑тесты для TerminalHandler (история/интеграция по минимуму).
 *
 * Цели:
 * - Убедиться, что модуль handlers/terminal-handler.cjs успешно загружается
 *   в реальной среде с @libs/*.
 * - Проверить наличие ключевых методов, связанных с терминальными командами
 *   и историей.
 *
 * ВАЖНО:
 * - Тест НЕ пытается мокать внутренние @libs/* и не пишет специальные данные
 *   в историю — он только проверяет каркас и базовые инварианты.
 * - Более глубокие проверки истории/Workspace будут добавляться отдельно,
 *   после выделения core‑слоя/адаптеров.
 */

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

async function testTerminalHandlerLoadsAndHasHistoryMethods() {
  try {
    // Поднимаем локальный module-alias, чтобы @libs/* корректно резолвились в реальной среде.
    // В среде CI/репо без C:\apps\libs этот тест может быть пропущен или упасть явно.
    // eslint-disable-next-line global-require
    require('../../setup-module-alias.cjs');

    // eslint-disable-next-line global-require
    const { TerminalHandler } = require('../../handlers/terminal-handler.cjs');

    if (typeof TerminalHandler !== 'function') {
      throw new Error('Ожидался экспортируемый класс TerminalHandler');
    }

    const mockServer = {
      logger: {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {}
      },
      mcpConfig: {
        terminal: {
          history: {
            enabled: true
          }
        }
      }
    };

    const handler = new TerminalHandler(mockServer);

    const requiredMethods = [
      'handleTerminalTool',
      '_shouldPersistHistory',
      '_checkHistoryLimit',
      '_incrementHistoryCount'
    ];

    const missing = requiredMethods.filter(
      (name) => typeof handler[name] !== 'function'
    );

    if (missing.length > 0) {
      throw new Error(
        `У TerminalHandler отсутствуют ожидаемые методы: ${missing.join(', ')}`
      );
    }

    logOk('TerminalHandler загружается и содержит базовые методы истории');
  } catch (error) {
    logFail(
      'TerminalHandler не удалось загрузить или структура класса не соответствует ожиданиям',
      error
    );
    process.exitCode = 1;
  }
}

async function main() {
  await testTerminalHandlerLoadsAndHasHistoryMethods();
}

if (require.main === module) {
  main().catch((error) => {
    logFail('Фатальная ошибка в тестах TerminalHandler (history)', error);
    process.exit(1);
  });
}


