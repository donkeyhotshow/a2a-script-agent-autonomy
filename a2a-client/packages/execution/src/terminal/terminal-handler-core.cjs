'use strict';

/**
 * Core‑функции TerminalHandler, не зависящие от @libs/*
 *
 * Здесь хранятся "чистые" помощники, которые:
 * - могут использоваться самим TerminalHandler;
 * - могут безопасно тестироваться без внешних зависимостей.
 */

const path = require('path');

/**
 * Разрешение относительного пути относительно текущей директории.
 *
 * @param {string} targetPath - путь из команды (cd ./foo, .., ~ и т.п.)
 * @param {string|null} currentCwd - текущая директория сессии (может быть null)
 * @param {Function} getCurrentDirSync - функция, возвращающая "системную" cwd
 * @returns {string} абсолютный путь
 */
function resolvePathCore(targetPath, currentCwd, getCurrentDirSync) {
    const baseDir = currentCwd || getCurrentDirSync();

    if (path.isAbsolute(targetPath)) {
        return targetPath;
    }

    // Обработка специальных случаев
    if (targetPath === '~') {
        return process.env.USERPROFILE || process.env.HOME || baseDir;
    }

    if (targetPath.startsWith('~/')) {
        const home = process.env.USERPROFILE || process.env.HOME || baseDir;
        return path.join(home, targetPath.substring(2));
    }

    if (targetPath === '..') {
        return path.dirname(baseDir);
    }

    if (targetPath === '.') {
        return baseDir;
    }

    return path.resolve(baseDir, targetPath);
}

/**
 * Анализ команды на предмет смены директории.
 *
 * Вся работа со стеком директорий (pushd/popd) выносится наружу через
 * getDirStack / setDirStack, что позволяет тестировать функцию изолированно.
 *
 * @param {string} command - команда терминала
 * @param {string|null} currentCwd - текущая директория
 * @param {Function} resolvePath - функция для преобразования targetPath → absPath
 * @param {Function} getDirStack - () => string[]; получение стека директорий
 * @param {Function} setDirStack - (stack: string[]) => void; установка стека
 * @param {Function} getCurrentDirSync - () => string; текущая системная cwd
 * @returns {string|null} новый путь или null, если команда не меняет директорию
 */
function analyzeDirectoryChangeCore(
    command,
    currentCwd,
    resolvePath,
    getDirStack,
    setDirStack,
    getCurrentDirSync
) {
    // Разделяем команду по точке с запятой и берем только первую часть
    // Это позволяет корректно обрабатывать команды вида: cd /path; ls
    const firstCommand = command.split(';')[0].trim();
    const cmd = firstCommand.toLowerCase();
    const originalCmd = firstCommand;

    // PowerShell команды
    if (cmd.startsWith('set-location ') || cmd.startsWith('cd ')) {
        const parts = originalCmd.split(/\s+/);
        if (parts.length >= 2) {
            const targetPath = parts.slice(1).join(' ').replace(/['"]/g, '');
            return resolvePath(targetPath, currentCwd);
        }
    }

    // pushd - сохранить текущую директорию в стек и перейти в новую
    if (cmd.startsWith('pushd ')) {
        const parts = originalCmd.split(/\s+/);
        if (parts.length >= 2) {
            const targetPath = parts.slice(1).join(' ').replace(/['"]/g, '');
            const newPath = resolvePath(targetPath, currentCwd);

            // Сохраняем текущую директорию в стек
            const stack = getDirStack();
            stack.push(currentCwd || getCurrentDirSync());
            setDirStack(stack);

            return newPath;
        }
    }

    // popd - извлечь директорию из стека
    if (cmd === 'popd') {
        const stack = getDirStack();
        if (stack.length > 0) {
            const newPath = stack.pop();
            setDirStack(stack);
            return newPath;
        }
    }

    return null; // Команда не меняет директорию
}

/**
 * Решение, нужно ли сохранять историю для текущей директории.
 *
 * Чистая функция, не трогает sessionVars и не логирует.
 *
 * @param {object|undefined} terminalConfig - this.server.mcpConfig.terminal
 * @param {string|null} initialCwd - изначальная директория сессии
 * @param {string|null} currentCwd - текущая директория
 * @returns {boolean} true, если историю следует сохранять
 */
function shouldPersistHistoryCore(terminalConfig, initialCwd, currentCwd) {
    const historyConfig = terminalConfig && terminalConfig.history;

    // Если история отключена - не сохраняем
    if (historyConfig && historyConfig.enabled === false) {
        return false;
    }

    // Если включено ограничение по изначальной директории
    if (historyConfig && historyConfig.restrictToInitialCwd) {
        if (initialCwd && currentCwd && currentCwd !== initialCwd) {
            return false;
        }
    }

    return true;
}

/**
 * Проверка лимита истории.
 *
 * Чистая функция, не обращается к sessionVars.
 *
 * @param {object|undefined} terminalConfig - this.server.mcpConfig.terminal
 * @param {number} currentCount - текущее количество записей истории
 * @returns {boolean} true, если ещё можно сохранять историю
 */
function checkHistoryLimitCore(terminalConfig, currentCount) {
    const historyConfig = terminalConfig && terminalConfig.history;
    const maxItems =
        historyConfig && historyConfig.maxItems ? historyConfig.maxItems : 1000;

    return currentCount < maxItems;
}

module.exports = {
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
};
