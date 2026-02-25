// Настройка module-alias для корректной работы с путями
const path = require('path');

function logWarn(message, meta = {}) {
  const payload = { ts: new Date().toISOString(), scope: 'setup-module-alias', message, ...meta };
  // eslint-disable-next-line no-console
  console.warn(`[MCP-SERVER-WARN] ${payload.message}`);
}

let moduleAlias;
try {
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  moduleAlias = require('module-alias');
  // Предзагружаем register.js, чтобы он был доступен для библиотек
  // Это нужно, потому что module-alias перехватывает разрешение модулей
  try {
    require.resolve('module-alias/register');
  } catch (registerError) {
    // Игнорируем, если не найден
  }
} catch (error) {
  logWarn('module-alias package is not installed. Aliases disabled.', { error: error.message });
  module.exports = {};
  return;
}

// По умолчанию используем локально скопированные libs внутри репозитория,
// чтобы не зависеть от внешнего дерева C:\apps\libs.
// При необходимости можно переопределить через MCP_LIBS_ROOT.
const defaultLibsDir = path.resolve(__dirname, 'packages', 'libs');
const libsDir = process.env.MCP_LIBS_ROOT || defaultLibsDir;
moduleAlias.addAlias('@libs', libsDir);
// Добавляем алиас для module-alias/register, чтобы библиотеки могли его найти
const moduleAliasPath = require.resolve('module-alias');
const moduleAliasDir = path.dirname(moduleAliasPath);
moduleAlias.addAlias('module-alias/register', path.join(moduleAliasDir, 'register.js'));
// Добавляем алиас для module-alias, чтобы библиотеки в @libs могли его найти
const projectRoot = path.resolve(__dirname);
moduleAlias.addAlias('module-alias', path.join(projectRoot, 'node_modules', 'module-alias'));
logWarn('module-alias registered successfully', { alias: '@libs', target: libsDir });

module.exports = {};









