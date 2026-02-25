#!/usr/bin/env node
'use strict';

/**
 * Базовые unit‑тесты для core‑логики TerminalHandler (workspace / cwd‑логика).
 *
 * Цели:
 * - Проверить, что resolvePathCore работает предсказуемо для простых кейсов.
 * - Проверить базовую работу analyzeDirectoryChangeCore для cd/pushd/popd
 *   на уровне вычисления целевой директории и работы со стеком.
 *
 * Тесты используют handlers/terminal-handler-core.cjs и не зависят от @libs/*.
 */

const path = require('path');
const {
  resolvePathCore,
  analyzeDirectoryChangeCore
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

async function testResolvePathBasicCases() {
  try {
    const baseDir = process.cwd();

    // Относительный путь
    const relativeResolved = resolvePathCore('subdir', baseDir, () => baseDir);
    if (relativeResolved !== path.resolve(baseDir, 'subdir')) {
      throw new Error(
        `Ожидалось, что _resolvePath('subdir') вернёт ${path.resolve(
          baseDir,
          'subdir'
        )}, получено ${relativeResolved}`
      );
    }

    // Текущая директория
    const dotResolved = resolvePathCore('.', baseDir, () => baseDir);
    if (dotResolved !== baseDir) {
      throw new Error(
        `Ожидалось, что _resolvePath('.') вернёт ${baseDir}, получено ${dotResolved}`
      );
    }

    // Родительская директория
    const parentResolved = resolvePathCore('..', baseDir, () => baseDir);
    if (parentResolved !== path.dirname(baseDir)) {
      throw new Error(
        `Ожидалось, что _resolvePath('..') вернёт ${path.dirname(
          baseDir
        )}, получено ${parentResolved}`
      );
    }

    logOk('TerminalHandler._resolvePath корректно обрабатывает базовые кейсы');
  } catch (error) {
    logFail(
      'Ошибка при проверке базовой логики _resolvePath в TerminalHandler',
      error
    );
    process.exitCode = 1;
  }
}

async function testAnalyzeDirectoryChangeCd() {
  try {
    const baseDir = process.cwd();

    const fakeStack = [];

    const newDir = analyzeDirectoryChangeCore(
      'cd subdir',
      baseDir,
      (targetPath, cwd) => resolvePathCore(targetPath, cwd, () => baseDir),
      () => fakeStack,
      (stack) => {
        // eslint-disable-next-line no-param-reassign
        fakeStack.length = 0;
        fakeStack.push(...stack);
      },
      () => baseDir
    );

    const expected = resolvePathCore('subdir', baseDir, () => baseDir);

    if (newDir !== expected) {
      throw new Error(
        `Ожидалось, что _analyzeDirectoryChange('cd subdir') вернёт ${expected}, получено ${newDir}`
      );
    }

    logOk(
      'TerminalHandler._analyzeDirectoryChange корректно обрабатывает простую cd‑команду'
    );
  } catch (error) {
    logFail(
      'Ошибка при проверке _analyzeDirectoryChange (cd) в TerminalHandler',
      error
    );
    process.exitCode = 1;
  }
}

async function main() {
  await testResolvePathBasicCases();
  await testAnalyzeDirectoryChangeCd();
}

if (require.main === module) {
  main().catch((error) => {
    logFail('Фатальная ошибка в тестах TerminalHandler (workspace)', error);
    process.exit(1);
  });
}


