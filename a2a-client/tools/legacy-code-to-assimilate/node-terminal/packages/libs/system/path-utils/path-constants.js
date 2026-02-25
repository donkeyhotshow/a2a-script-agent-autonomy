/**
 * Константы путей
 * Модуль содержит все константы путей для различных модулей системы
 */

import path from 'path';
import { fileURLToPath } from 'url';

const isBrowser = typeof window !== 'undefined';

let APP_ROOT;

if (isBrowser) {
  APP_ROOT = 'C:\\apps';
} else {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    APP_ROOT = path.resolve(__dirname, '..', '..', '..');
  } catch (error) {
    console.warn('[PATH-UTILS] Fallback to browser mode due to import error:', error.message);
    APP_ROOT = 'C:\\apps';
  }
}

const LIBS_ROOT = path.join(APP_ROOT, 'libs');
const COMMAND_UTILS_PATH = path.join(LIBS_ROOT, 'app-framework', 'cli', 'command-utils', 'index.js');
const ERROR_HANDLER_PATH = path.join(LIBS_ROOT, 'error-management', 'error-handler', 'error-utils.js');
const CONSOLE_UTILS_PATH = path.join(LIBS_ROOT, 'logging-monitoring', 'logging', 'console-utils.cjs');
const FILE_OPERATIONS_PATH = path.join(LIBS_ROOT, 'system', 'file-operations', 'index.js');
const VALIDATION_UTILS_PATH = path.join(LIBS_ROOT, 'validation', 'validation', 'validation-utils.js');

const SERVER_ROOT = path.join(APP_ROOT, 'root', 'api');
const PATH_VALIDATION_SERVER_PATH = path.join(SERVER_ROOT, 'middleware', 'validation.js');
const COMMAND_VALIDATION_SERVER_PATH = path.join(SERVER_ROOT, 'middleware', 'validation.js');
const CONFIG_SERVER_PATH = path.join(SERVER_ROOT, 'config.js');
const UTILS_SERVER_PATH = path.join(SERVER_ROOT, 'server.js');
const CORE_SERVER_PATH = path.join(SERVER_ROOT, 'server.js');
const MAIN_SERVER_CJS = path.join(APP_ROOT, 'root', 'server.js');

const TESTS_ROOT = path.join(APP_ROOT, 'root', 'tests');
const INTEGRATION_TEST_PATH = path.join(TESTS_ROOT, 'integration', 'integration-test.js');
const MAIN_SERVER_INTEGRATION_TEST_PATH = path.join(TESTS_ROOT, 'integration', 'main-server-integration-test.js');
const PERFORMANCE_TEST_PATH = path.join(TESTS_ROOT, 'performance', 'performance-test.js');
const COMPATIBILITY_TEST_PATH = path.join(TESTS_ROOT, 'compatibility', 'compatibility-test.js');
const POWERSHELL_UNICODE_TESTS_PATH = path.join(TESTS_ROOT, 'unit', 'powershell-unicode-tests.js');
const RUN_POWERSHELL_UNICODE_TESTS_PATH = path.join(TESTS_ROOT, 'run-powershell-unicode-tests.js');
const POWERSHELL_UNICODE_INTEGRATION_TEST_PATH = path.join(TESTS_ROOT, 'integration', 'powershell-unicode-integration.test.js');
const TEST_REPORTS_DIR_PATH = path.join(TESTS_ROOT, 'test-reports');
const COMMAND_RUNNER_PATH = path.join(APP_ROOT, 'root', 'scripts', 'command-runner.js');
const HISTORY_CJS_PATH = path.join(APP_ROOT, 'root', 'core', 'History.js');
const WORKDIR_CJS_PATH = path.join(APP_ROOT, 'root', 'core', 'Workdir.js');
const ENHANCED_TIMEOUT_HINTS_CJS_PATH = path.join(LIBS_ROOT, 'system', 'enhanced-timeout-hints.js');
const DEBUG_SYSTEM_CJS_PATH = path.join(LIBS_ROOT, 'logging-monitoring', 'debug', 'DebugSystem.js');
const COMMAND_CONVERTER_CJS_PATH = path.join(LIBS_ROOT, 'cli-utils', 'command-converter.js');
const SYNTAX_FIXER_CLI_CJS_PATH = path.join(APP_ROOT, 'root', 'scripts', 'syntax-fixer-cli.js');
const INPUT_PROCESSOR_CJS_PATH = path.join(LIBS_ROOT, 'cli-utils', 'input-processor.js');
const TEST_INTERCEPTOR_CJS_PATH = path.join(LIBS_ROOT, 'testing', 'test-interceptor.js');

const PATH_VALIDATION_CJS_PATH = path.join(SERVER_ROOT, 'middleware', 'validation.js');
const COMMAND_VALIDATION_CJS_PATH = path.join(SERVER_ROOT, 'middleware', 'validation.js');
const CONFIG_CJS_PATH = path.join(SERVER_ROOT, 'config.js');
const UTILS_CJS_PATH = path.join(SERVER_ROOT, 'server.js');
const CORE_SERVER_CJS_PATH = path.join(SERVER_ROOT, 'server.js');

const MODULES_ROOT = path.join(SERVER_ROOT, 'modules');
const FILE_OPERATIONS_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'file-operations', 'FileOperations.js');
const TEST_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'testing', 'Test.js');
const INTERCEPTOR_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'cli-utils', 'Interceptor.js');
const POWERSHELL_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'PowerShell.js');
const ATOMIC_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'Atomic.js');
const ARCHIVE_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'Archive.js');
const SEARCH_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'Search.js');
const TERMINAL_MODULE_CJS_PATH = path.join(LIBS_ROOT, 'system', 'Terminal.js');

const COMMAND_INTERCEPTORS_CJS_PATH = path.join(LIBS_ROOT, 'cli-utils', 'CommandInterceptors.js');
const POWERSHELL_ERROR_HANDLER_CJS_PATH = path.join(LIBS_ROOT, 'error-management', 'PowerShellErrorHandler.js');

export {
  isBrowser,
  APP_ROOT,
  LIBS_ROOT,
  COMMAND_UTILS_PATH,
  ERROR_HANDLER_PATH,
  CONSOLE_UTILS_PATH,
  FILE_OPERATIONS_PATH,
  VALIDATION_UTILS_PATH,
  SERVER_ROOT,
  PATH_VALIDATION_SERVER_PATH,
  COMMAND_VALIDATION_SERVER_PATH,
  CONFIG_SERVER_PATH,
  UTILS_SERVER_PATH,
  CORE_SERVER_PATH,
  MAIN_SERVER_CJS,
  TESTS_ROOT,
  INTEGRATION_TEST_PATH,
  MAIN_SERVER_INTEGRATION_TEST_PATH,
  PERFORMANCE_TEST_PATH,
  COMPATIBILITY_TEST_PATH,
  POWERSHELL_UNICODE_TESTS_PATH,
  RUN_POWERSHELL_UNICODE_TESTS_PATH,
  POWERSHELL_UNICODE_INTEGRATION_TEST_PATH,
  TEST_REPORTS_DIR_PATH,
  COMMAND_RUNNER_PATH,
  HISTORY_CJS_PATH,
  WORKDIR_CJS_PATH,
  ENHANCED_TIMEOUT_HINTS_CJS_PATH,
  DEBUG_SYSTEM_CJS_PATH,
  COMMAND_CONVERTER_CJS_PATH,
  SYNTAX_FIXER_CLI_CJS_PATH,
  INPUT_PROCESSOR_CJS_PATH,
  TEST_INTERCEPTOR_CJS_PATH,
  PATH_VALIDATION_CJS_PATH,
  COMMAND_VALIDATION_CJS_PATH,
  CONFIG_CJS_PATH,
  UTILS_CJS_PATH,
  CORE_SERVER_CJS_PATH,
  MODULES_ROOT,
  FILE_OPERATIONS_MODULE_CJS_PATH,
  TEST_MODULE_CJS_PATH,
  INTERCEPTOR_MODULE_CJS_PATH,
  POWERSHELL_MODULE_CJS_PATH,
  ATOMIC_MODULE_CJS_PATH,
  ARCHIVE_MODULE_CJS_PATH,
  SEARCH_MODULE_CJS_PATH,
  TERMINAL_MODULE_CJS_PATH,
  COMMAND_INTERCEPTORS_CJS_PATH,
  POWERSHELL_ERROR_HANDLER_CJS_PATH,
};
