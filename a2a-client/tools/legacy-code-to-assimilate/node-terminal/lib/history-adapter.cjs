'use strict';

/**
 * Адаптер истории для MCP Terminal.
 *
 * Цели:
 * - проксировать вызовы в реальный модуль истории (`@libs/system/history/index.cjs`);
 * - дополнительно писать глобальный лог в `data/global-history/commands.jsonl` в этом репо.
 *
 * Важно:
 * - не меняем поведение внешней истории (сессии, by_error и т.п.);
 * - глобальный лог — "плоский" JSONL со сглаженной структурой под анализ/тесты.
 */

const fs = require('fs');
const path = require('path');

let baseHistory;
try {
  // Основной путь — внешний libs-пакет
  // (для реального запуска MCP Terminal в общей монорепе)
  baseHistory = require('@libs/system/history/index.cjs');
} catch (externalError) {
  try {
    // Фолбэк — локальная копия внутри этого репо (для unit-тестов)
    // packages/libs/system/history/index.cjs относительно корня проекта
    const localHistoryPath = path.resolve(__dirname, '../packages/libs/system/history/index.cjs');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    baseHistory = require(localHistoryPath);
  } catch (localError) {
    // Если вообще не удалось найти модуль истории — создаём минимальный стаб,
    // чтобы не ломать загрузку сервера (но глобальный лог тогда не пишется).
    // eslint-disable-next-line no-console
    console.error('[HISTORY-ADAPTER] Failed to load history module:', externalError.message, localError && localError.message);
    baseHistory = {
      persistHistoryRecord: () => {},
      listSessions: () => [],
      loadSessionRecords: () => [],
      getCurrentSessionId: () => null,
      setCurrentSessionId: () => false,
      createAndSwitchSession: () => null,
      getSessionForCwd: () => null
    };
  }
}

const {
  persistHistoryRecord: basePersistHistoryRecord,
  listSessions,
  loadSessionRecords,
  getCurrentSessionId,
  setCurrentSessionId,
  createAndSwitchSession,
  getSessionForCwd,
  SessionManager,
  HistoryRecordManager
} = baseHistory;

// Корень текущего MCP-проекта: c:\apps\root\mcp\node-terminal
const appRoot = path.resolve(__dirname, '..');
const globalHistoryDir = path.join(appRoot, 'data', 'global-history');
const globalHistoryFile = path.join(globalHistoryDir, 'commands.jsonl');

function ensureGlobalHistoryDir() {
  try {
    if (!fs.existsSync(globalHistoryDir)) {
      fs.mkdirSync(globalHistoryDir, { recursive: true });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[HISTORY-ADAPTER] Failed to ensure global history dir:', error.message);
  }
}

/**
 * Нормализация записи под глобальный лог.
 *
 * Формат (минимальный инвариант):
 * - id: string
 * - timestamp: ISO string
 * - tool: 'terminal'
 * - command: string
 * - cwd: string | null
 * - sessionId: string | null
 * - success: boolean
 * - duration: number (ms)
 * - exitCode: number
 * - stdout / stderr / error: опционально
 */
function normalizeGlobalRecord(record) {
  const now = new Date();
  const timestamp = record.timestamp || now.toISOString();

  const sessionId = record.session_id || record.sessionId || null;
  const exitCode = typeof record.return_code === 'number'
    ? record.return_code
    : (typeof record.exitCode === 'number' ? record.exitCode : 0);

  let durationMs = 0;
  if (typeof record.duration === 'number') {
    durationMs = record.duration;
  } else if (typeof record.duration === 'string' && record.duration.trim().length > 0) {
    const parsed = Number(record.duration);
    durationMs = Number.isFinite(parsed) ? parsed : 0;
  }

  const id = [
    timestamp,
    sessionId || 'no-session',
    Math.random().toString(36).slice(2, 10)
  ].join(':');

  return {
    id,
    timestamp,
    tool: 'terminal',
    command: String(record.command || ''),
    cwd: record.cwd || null,
    sessionId,
    success: !!record.success,
    duration: durationMs,
    exitCode,
    stdout: typeof record.stdout === 'string' && record.stdout.length > 0 ? record.stdout : undefined,
    stderr: typeof record.stderr === 'string' && record.stderr.length > 0 ? record.stderr : undefined,
    error: typeof record.error === 'string' && record.error.length > 0 ? record.error : undefined
  };
}

function appendToGlobalHistory(record) {
  try {
    ensureGlobalHistoryDir();
    const normalized = normalizeGlobalRecord(record);
    fs.appendFileSync(globalHistoryFile, JSON.stringify(normalized) + '\n', 'utf8');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[HISTORY-ADAPTER] Failed to append to global history:', error.message);
  }
}

/**
 * Обёртка над базовым persistHistoryRecord:
 * - всегда вызывает базовую реализацию (сессии и т.п.);
 * - независимо от результата пытается записать глобальный лог.
 */
function persistHistoryRecord(record) {
  try {
    if (typeof basePersistHistoryRecord === 'function') {
      basePersistHistoryRecord(record);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[HISTORY-ADAPTER] Error in base persistHistoryRecord:', error.message);
  }

  appendToGlobalHistory(record);
}

module.exports = {
  persistHistoryRecord,
  listSessions,
  loadSessionRecords,
  getCurrentSessionId,
  setCurrentSessionId,
  createAndSwitchSession,
  getSessionForCwd,
  SessionManager,
  HistoryRecordManager
};


