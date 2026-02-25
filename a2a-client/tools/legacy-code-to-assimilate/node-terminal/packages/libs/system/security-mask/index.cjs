/**
 * @fileoverview Основная реализация анализатора безопасности команд для MCP Terminal.
 * Функциональность, связанная с SecurityAnalyzer, находится здесь, а не в libs/core/security-analyzer.
 * @author MCP Terminal Team
 * @version 1.0.0
 */;
// Note: errorUtils is a class that needs instantiation
// For now, we'll use a simple wrapper to avoid breaking changes
const simpleErrorHandler = {
  logError: (error, context) => {
    console.error(`[${context}] Error:`, error.message);
  }
};

const errorUtils = {
  safeExecute: async (fn, context = 'unknown') => {
    try {
      return await fn();
    } catch (error) {
      simpleErrorHandler.logError(error, context);
      throw error;
    }
  }
};

// Опциональный импорт DebugSystem - может быть недоступен в некоторых контекстах
let debugSystem = null;
let DEBUG_CATEGORIES = {};
try {
  const path = require('path');
  // Пытаемся найти DebugSystem относительно корня проекта (mcp/DebugSystem.cjs)
  // Путь вычисляется относительно текущего файла: packages/libs/system/security-mask/index.cjs
  // Нужно подняться на 4 уровня: security-mask -> system -> libs -> packages -> корень -> mcp
  const projectRoot = path.resolve(__dirname, '../../../../');
  const debugSystemPath = path.join(projectRoot, 'mcp', 'DebugSystem.cjs');
  const debugSystemModule = require(debugSystemPath);
  debugSystem = debugSystemModule.debugSystem;
  DEBUG_CATEGORIES = debugSystemModule.DEBUG_CATEGORIES || {};
} catch (debugSystemError) {
  // DebugSystem недоступен - продолжаем без отладки
  debugSystem = {
    registerProblem: () => {} // no-op
  };
  DEBUG_CATEGORIES = {
    SECURITY_SELFTEST: 'security-selftest',
    SECURITY_BLOCK: 'security-block'
  };
}

// Модуль для анализа безопасности команд;
class SecurityAnalyzer {
	static CRITICAL_PATTERNS = [
		/\b(rm\s+-rf?|del\s+\/s|format\s+[a-z]:)/i,
		/\b(shutdown|reboot|restart)\b/i,
		/\b(net\s+user|net\s+localgroup)\b/i,
		/\b(reg\s+add|reg\s+delete)\b/i,
		/\b(wmic\s+process|wmic\s+service)\b/i
	];

	static FORBIDDEN_PATTERNS = [
		/\b(read|more|less|nano|vi|vim|ssh|ftp|sftp)\b/i,
		/\b(attrib\s+[+-][hsr])\b/i,
		/\b(cacls|icacls)\b/i,
		/\b(taskkill\s+\/im\s+explorer)\b/i,
		/\b(rundll32\s+shell32)\b/i
	];

	static ALLOWED_PATTERNS = [
		/\b(echo|dir|ls|cat|type|pwd|whoami|ver|cls|clear)\b/i,
		/\b(node\s+-e|node\s+--version)\b/i,
		/\b(npm\s+--version|npm\s+list)\b/i,
		/\b(git\s+--version|git\s+status|git\s+log)\b/i,
		/\b(ping\s+[0-9.]+|ping\s+[a-z.]+)\b/i,
		/\b(ipconfig|ifconfig|netstat)\b/i,
		/\b(jest|npx\s+jest)\b/i,
		/\b(echo\s+"[^"]*")\b/i
	];

	static WHITELIST_COMMANDS = [
		'echo', 'dir', 'ls', 'cat', 'type', 'pwd', 'whoami', 'ver', 'cls', 'clear',
		'node', 'npm', 'npx', 'git', 'ping', 'ipconfig', 'ifconfig', 'netstat'
	];

	/**
	 * Самопроверка системы безопасности
	 * Безопасно тестирует логику блокировки без реального выполнения команд
	 * @returns {Object} Результат самопроверки
	 */
	static selfTest() {
		const results = {
			passed: 0,
			failed: 0,
			total: 0,
			details: [],
			criticalIssues: [],
			overallStatus: 'unknown'
		};

		// Тестовые команды для проверки блокировки
		const testCases = [
			// Критические команды - должны быть заблокированы
			{
				command: 'format X:',
				expectedBlocked: true,
				description: 'Форматирование несуществующего диска X:',
				category: 'critical'
			},
			{
				command: 'rm -rf /nonexistent/path',
				expectedBlocked: true,
				description: 'Удаление несуществующего пути',
				category: 'critical'
			},
			{
				command: 'del /s /q X:\\nonexistent',
				expectedBlocked: true,
				description: 'Удаление на несуществующем диске',
				category: 'critical'
			},
			{
				command: 'shutdown /s /t 0',
				expectedBlocked: true,
				description: 'Команда выключения',
				category: 'critical'
			},
			{
				command: 'net user hacker /add',
				expectedBlocked: true,
				description: 'Создание пользователя',
				category: 'critical'
			},
			// Безопасные команды - должны быть разрешены
			{
				command: 'echo "test"',
				expectedBlocked: false,
				description: 'Безопасная команда echo',
				category: 'safe'
			},
			{
				command: 'dir',
				expectedBlocked: false,
				description: 'Безопасная команда dir',
				category: 'safe'
			},
			{
				command: 'ls -la',
				expectedBlocked: false,
				description: 'Безопасная команда ls',
				category: 'safe'
			},
			{
				command: 'node --version',
				expectedBlocked: false,
				description: 'Безопасная команда node',
				category: 'safe'
			},
			{
				command: 'git status',
				expectedBlocked: false,
				description: 'Безопасная команда git',
				category: 'safe'
			},
			// Запрещенные команды - должны быть заблокированы
			{
				command: 'read variable',
				expectedBlocked: true,
				description: 'Интерактивная команда read',
				category: 'forbidden'
			},
			{
				command: 'more file.txt',
				expectedBlocked: true,
				description: 'Интерактивная команда more',
				category: 'forbidden'
			},
			{
				command: 'ssh user@host',
				expectedBlocked: true,
				description: 'Сетевая команда ssh',
				category: 'forbidden'
			},
			// Граничные случаи
			{
				command: '',
				expectedBlocked: true,
				description: 'Пустая команда',
				category: 'edge'
			},
			{
				command: '   ',
				expectedBlocked: true,
				description: 'Команда только с пробелами',
				category: 'edge'
			},
			{
				command: 'echo "test message"',
				expectedBlocked: false,
				description: 'Безопасная команда echo с сообщением',
				category: 'edge'
			}
		];

		// Выполняем тесты
		for (const testCase of testCases) {
			results.total++;
			
			errorUtils.safeExecute(async () => {
				const analysis = this.analyzeCommand(testCase.command);
				const isBlocked = !analysis.is_allowed;
				const testPassed = isBlocked === testCase.expectedBlocked;

				if (testPassed) {
					results.passed++;
				} else {
					results.failed++;
					
					const issue = {
						test: testCase.description,
						command: testCase.command,
						expected: testCase.expectedBlocked ? 'blocked' : 'allowed',
						actual: isBlocked ? 'blocked' : 'allowed',
						reason: analysis.reason,
						category: testCase.category
					};

					results.details.push(issue);
					
					if (testCase.category === 'critical') {
						results.criticalIssues.push(issue);
					}
				}
			}, 'error');
		}

		// Определяем общий статус
		if (results.failed === 0) {
			results.overallStatus = 'passed';
		} else if (results.criticalIssues.length > 0) {
			results.overallStatus = 'critical_failure';
		} else {
			results.overallStatus = 'partial_failure';
		}

		// Регистрируем результат самопроверки
		debugSystem.registerProblem({
			category: DEBUG_CATEGORIES.SECURITY_SELFTEST,
			title: 'Самопроверка системы безопасности',
			description: `Результат: ${results.overallStatus}, ${results.passed}/${results.total} тестов пройдено`,
			command: 'self_test',
			errorDetails: results.criticalIssues.length > 0 ? 
				`Критические проблемы: ${results.criticalIssues.length}` : 
				'Все критические тесты пройдены',
			reason: `Самопроверка завершена: ${results.overallStatus}`,
			suggestions: results.criticalIssues.length > 0 ? 
				['Проверьте конфигурацию системы безопасности'] : 
				['Система безопасности работает корректно'],
			securityAnalysis: `Пройдено ${results.passed} из ${results.total} тестов`,
			securityPolicy: 'Самопроверка системы безопасности',
			cwd: process.cwd(),
			context: {
				passed: results.passed,
				failed: results.failed,
				total: results.total,
				criticalIssues: results.criticalIssues.length,
				status: results.overallStatus
			}
		});

		return results;
	}

	/**
	 * Быстрая проверка критических паттернов
	 * Проверяет только самые опасные команды
	 * @returns {boolean} true если система работает корректно
	 */
	static quickCriticalTest() {
		const criticalTests = [
			{ command: 'format X:', shouldBlock: true },
			{ command: 'rm -rf /', shouldBlock: true },
			{ command: 'echo test', shouldBlock: false }
		];

		for (const test of criticalTests) {
			const analysis = this.analyzeCommand(test.command);
			const isBlocked = !analysis.is_allowed;
			
			if (isBlocked !== test.shouldBlock) {
				return false;
			}
		}
		
		return true;
	}

	static getOsCriticalPatterns() {
		const isWindows = process.platform === 'win32';
		if (isWindows) {
			return [
				/\b(format\s+[a-z]:)\b/i,
				/\b(del\s+\/s\s+[a-z]:\\windows)\b/i,
				/\b(reg\s+add\s+HKLM)\b/i,
				/\b(wmic\s+process\s+where)\b/i
			];
		}
		return [
			/\b(rm\s+-rf\s+\/)\b/i,
			/\b(dd\s+if=\/dev\/zero)\b/i,
			/\b(mkfs\s+\/dev\/)\b/i
		];
	}

	static getSuggestions(command, reason) {
		const suggestions = [];
		
		if (reason.includes('read|more|less|nano|vi|vim')) {
			suggestions.push('Используйте cat или type для просмотра файлов');
		}
		
		if (reason.includes('rm -rf') || reason.includes('del /s')) {
			suggestions.push('Используйте dir или ls для просмотра содержимого');
		}
		
		if (reason.includes('format') || reason.includes('mkfs')) {
			suggestions.push('Операции форматирования запрещены');
		}
		
		if (reason.includes('ssh|ftp|sftp')) {
			suggestions.push('Сетевые команды ограничены. Используйте ping для проверки соединения');
		}
		
		return suggestions;
	}

	static analyzeCommand(command) {
		const cmd = String(command || '').trim();
		if (!cmd) {
			return {
				is_allowed: false,
				reason: 'Пустая команда',
				suggestions: ['Укажите команду для выполнения']
			};
		}

		// Проверка критических паттернов
		for (const pattern of this.CRITICAL_PATTERNS) {
			if (pattern.test(cmd)) {
				const result = {
					is_allowed: false,
					reason: 'Критическая команда: ' + pattern.source,
					suggestions: this.getSuggestions(cmd, pattern.source)
				};

				// Регистрируем критическую проблему безопасности
				debugSystem.registerProblem({
					category: DEBUG_CATEGORIES.SECURITY_BLOCK,
					title: 'Критическая команда заблокирована',
					description: `Команда заблокирована системой безопасности: ${pattern.source}`,
					command: cmd,
					errorDetails: `Критическая команда: ${pattern.source}`,
					reason: result.reason,
					suggestions: result.suggestions.join('\n'),
					securityAnalysis: 'Команда содержит критические паттерны, которые могут повредить систему',
					securityPolicy: 'Блокировка критических команд',
					cwd: process.cwd(),
					context: {
						pattern: pattern.source,
						severity: 'critical'
					}
				});

				return result;
			}
		}

		// Проверка OS-специфичных критических паттернов
		for (const pattern of this.getOsCriticalPatterns()) {
			if (pattern.test(cmd)) {
				return {
					is_allowed: false,
					reason: 'Критическая команда для ОС: ' + pattern.source,
					suggestions: this.getSuggestions(cmd, pattern.source)
				};
			}
		}

		// Проверка белого списка
		for (const allowed of this.WHITELIST_COMMANDS) {
			if (cmd.toLowerCase().startsWith(allowed.toLowerCase())) {
				return { is_allowed: true, reason: 'Команда в белом списке' };
			}
		}

		// Проверка разрешённых паттернов
		for (const pattern of this.ALLOWED_PATTERNS) {
			if (pattern.test(cmd)) {
				return { is_allowed: true, reason: 'Соответствует разрешённому паттерну' };
			}
		}

		// Проверка запрещённых паттернов
		for (const pattern of this.FORBIDDEN_PATTERNS) {
			if (pattern.test(cmd)) {
				return {
					is_allowed: false,
					reason: 'Запрещено по политике безопасности: соответствует паттерну \'' + pattern.source + '\'',
					suggestions: this.getSuggestions(cmd, pattern.source)
				};
			}
		}

		// Проверка интерактивных команд
		if (/\b(read|more|less|nano|vi|vim)\b/i.test(cmd)) {
			return {
				is_allowed: false,
				reason: 'Интерактивные команды запрещены',
				suggestions: ['Используйте cat или type для просмотра файлов']
			};
		}

		// По умолчанию разрешаем
		return { is_allowed: true, reason: 'Команда разрешена' };
	}
}

// Экспорт функций для обратной совместимости;
function analyzeCommand(command) {
	return SecurityAnalyzer.analyzeCommand(command);
}
;
function getOsCriticalPatterns() {
	return SecurityAnalyzer.getOsCriticalPatterns();
}
;
function getSuggestions(command, reason) {
	return SecurityAnalyzer.getSuggestions(command, reason);
}
;
function selfTest() {
	return SecurityAnalyzer.selfTest();
}
;
function quickCriticalTest() {
	return SecurityAnalyzer.quickCriticalTest();
}
;
module.exports = {
	analyzeCommand,
	getOsCriticalPatterns,
	getSuggestions,
	selfTest,
	quickCriticalTest,
	SecurityAnalyzer
};

