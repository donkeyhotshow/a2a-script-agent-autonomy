/**
 * Session Variables Management
 * Управление переменными сессии для MCP сервера
 */

// Хранилище переменных сессии
const sessionVariables = new Map();

// Специфические переменные для project workspace
const PROJECT_WORKSPACE_KEY = 'project_workspace';

/**
 * Установка переменной сессии
 */
function setSessionVar(key, value) {
  sessionVariables.set(key, value);
  return { success: true, key, value };
}

/**
 * Получение переменной сессии
 */
function getSessionVar(key) {
  const value = sessionVariables.get(key);
  return { success: true, key, value, exists: value !== undefined };
}

/**
 * Удаление переменной сессии
 */
function deleteSessionVar(key) {
  const exists = sessionVariables.has(key);
  if (exists) {
    sessionVariables.delete(key);
  }
  return { success: true, key, deleted: exists };
}

/**
 * Получение всех переменных сессии
 */
function getAllSessionVars() {
  const vars = {};
  for (const [key, value] of sessionVariables.entries()) {
    vars[key] = value;
  }
  return { success: true, variables: vars, count: sessionVariables.size };
}

/**
 * Очистка всех переменных сессии
 */
function clearSessionVars() {
  const count = sessionVariables.size;
  sessionVariables.clear();
  return { success: true, cleared: count };
}

/**
 * Проверка существования переменной
 */
function hasSessionVar(key) {
  return { success: true, key, exists: sessionVariables.has(key) };
}

/**
 * Специфические функции для работы с project workspace
 */
function setProjectWorkspace(path) {
  return setSessionVar(PROJECT_WORKSPACE_KEY, path);
}

function getProjectWorkspace() {
  const result = getSessionVar(PROJECT_WORKSPACE_KEY);
  return result.exists ? result.value : null;
}

function hasProjectWorkspace() {
  const result = hasSessionVar(PROJECT_WORKSPACE_KEY);
  return result.exists;
}

// Экспорт функций
module.exports = {
  sessionVars: {
    set: setSessionVar,
    get: getSessionVar,
    delete: deleteSessionVar,
    getAll: getAllSessionVars,
    clear: clearSessionVars,
    has: hasSessionVar,
    // Project workspace методы
    setProjectWorkspace,
    getProjectWorkspace,
    hasProjectWorkspace
  },

  // Прямые функции для обратной совместимости
  setSessionVar,
  getSessionVar,
  deleteSessionVar,
  getAllSessionVars,
  clearSessionVars,
  hasSessionVar,
  // Project workspace функции
  setProjectWorkspace,
  getProjectWorkspace,
  hasProjectWorkspace
};
