export const isBrowser = typeof window !== 'undefined';

export const APP_ROOT = isBrowser ? 'C:\\apps' : 'C:\\apps'; // Fallback to a fixed path for non-browser

export const LIBS_ROOT = APP_ROOT + '/libs';
export const COMMAND_UTILS_PATH = LIBS_ROOT + '/app-framework/cli/command-utils/index.js';
export const ERROR_HANDLER_PATH = LIBS_ROOT + '/error-management/error-handler/error-utils.js';
export const CONSOLE_UTILS_PATH = LIBS_ROOT + '/logging-monitoring/logging/console-utils.cjs';
export const FILE_OPERATIONS_PATH = LIBS_ROOT + '/system/file-operations/index.js';
export const VALIDATION_UTILS_PATH = LIBS_ROOT + '/validation/validation/validation-utils.js';

export const SERVER_ROOT = APP_ROOT + '/root/api';
export const PATH_VALIDATION_SERVER_PATH = SERVER_ROOT + '/middleware/validation.js';
export const COMMAND_VALIDATION_SERVER_PATH = SERVER_ROOT + '/middleware/validation.js';
export const CONFIG_SERVER_PATH = SERVER_ROOT + '/config.js';
export const UTILS_SERVER_PATH = SERVER_ROOT + '/server.js';
export const CORE_SERVER_PATH = SERVER_ROOT + '/server.js';
export const MAIN_SERVER_CJS = APP_ROOT + '/root/server.js';

export const TESTS_ROOT = APP_ROOT + '/root/tests';
export const INTEGRATION_TEST_PATH = TESTS_ROOT + '/integration/integration-test.js';
export const MAIN_SERVER_INTEGRATION_TEST_PATH = TESTS_ROOT + '/integration/main-server-integration-test.js';
export const PERFORMANCE_TEST_PATH = TESTS_ROOT + '/performance/performance-test.js';
export const COMPATIBILITY_TEST_PATH = TESTS_ROOT + '/compatibility/compatibility-test.js';
export const POWERSHELL_UNICODE_TESTS_PATH = TESTS_ROOT + '/unit/powershell-unicode-tests.js';
export const RUN_POWERSHELL_UNICODE_TESTS_PATH = TESTS_ROOT + '/run-powershell-unicode-tests.js';
export const POWERSHELL_UNICODE_INTEGRATION_TEST_PATH = TESTS_ROOT + '/integration/powershell-unicode-integration.test.js';
export const TEST_REPORTS_DIR_PATH = TESTS_ROOT + '/test-reports';
export const COMMAND_RUNNER_PATH = APP_ROOT + '/root/scripts/command-runner.js';
export const HISTORY_CJS_PATH = APP_ROOT + '/root/core/History.js';
export const WORKDIR_CJS_PATH = APP_ROOT + '/root/core/Workdir.js';
export const ENHANCED_TIMEOUT_HINTS_CJS_PATH = LIBS_ROOT + '/system/enhanced-timeout-hints.js';
export const DEBUG_SYSTEM_CJS_PATH = LIBS_ROOT + '/logging-monitoring/debug/DebugSystem.js';
export const COMMAND_CONVERTER_CJS_PATH = LIBS_ROOT + '/cli-utils/command-converter.js';
export const SYNTAX_FIXER_CLI_CJS_PATH = APP_ROOT + '/root/scripts/syntax-fixer-cli.js';
export const INPUT_PROCESSOR_CJS_PATH = LIBS_ROOT + '/cli-utils/input-processor.js';
export const TEST_INTERCEPTOR_CJS_PATH = LIBS_ROOT + '/testing/test-interceptor.js';

export const PATH_VALIDATION_CJS_PATH = SERVER_ROOT + '/middleware/validation.js';
export const COMMAND_VALIDATION_CJS_PATH = SERVER_ROOT + '/middleware/validation.js';
export const CONFIG_CJS_PATH = SERVER_ROOT + '/config.js';
export const UTILS_CJS_PATH = SERVER_ROOT + '/server.js';
export const CORE_SERVER_CJS_PATH = SERVER_ROOT + '/server.js';

export const MODULES_ROOT = SERVER_ROOT + '/modules';
export const FILE_OPERATIONS_MODULE_CJS_PATH = LIBS_ROOT + '/system/file-operations/FileOperations.js';
export const TEST_MODULE_CJS_PATH = LIBS_ROOT + '/testing/Test.js';
export const INTERCEPTOR_MODULE_CJS_PATH = LIBS_ROOT + '/cli-utils/Interceptor.js';
export const POWERSHELL_MODULE_CJS_PATH = LIBS_ROOT + '/system/PowerShell.js';
export const ATOMIC_MODULE_CJS_PATH = LIBS_ROOT + '/system/Atomic.js';
export const ARCHIVE_MODULE_CJS_PATH = LIBS_ROOT + '/system/Archive.js';
export const SEARCH_MODULE_CJS_PATH = LIBS_ROOT + '/system/Search.js';
export const TERMINAL_MODULE_CJS_PATH = LIBS_ROOT + '/system/Terminal.js';

export const COMMAND_INTERCEPTORS_CJS_PATH = LIBS_ROOT + '/cli-utils/CommandInterceptors.js';
export const POWERSHELL_ERROR_HANDLER_CJS_PATH = LIBS_ROOT + '/error-management/PowerShellErrorHandler.js';


