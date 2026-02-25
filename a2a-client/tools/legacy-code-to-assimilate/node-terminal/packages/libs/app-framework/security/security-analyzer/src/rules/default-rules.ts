/**
 * @fileoverview Стандартные правила безопасности
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { PatternSecurityRule, FunctionSecurityRule } from './index';
import { SecuritySeverity } from '../types';

/**
 * Создает стандартные правила безопасности
 */
export function createDefaultRules(): Array<PatternSecurityRule | FunctionSecurityRule> {
  const rules: Array<PatternSecurityRule | FunctionSecurityRule> = [];

  // ===========================================
  // Критические системные команды
  // ===========================================
  rules.push(new PatternSecurityRule(
    'destructive_commands',
    'Деструктивные системные команды',
    'critical',
    [
      /\b(rm\s+-rf?\s+\/|del\s+\/s\s+c:\\)/i,
      /\b(format\s+[a-z]:|mkfs\s+\/dev\/)/i,
      /\b(dd\s+if=\/dev\/zero)/i,
      /\b(fdisk\s+\/dev\/)/i,
      /\bsudo\s+rm\s+-rf\s+\//i,
      /\b(shutdown|reboot|restart)\b/i,
      /\b(net\s+user|net\s+localgroup)\b/i,
      /\b(reg\s+add|reg\s+delete)\b/i,
      /\b(wmic\s+process|wmic\s+service)\b/i
    ],
    [
      'Используйте более безопасные альтернативы для удаления файлов',
      'Рассмотрите использование системы контроля версий',
      'Создавайте резервные копии перед деструктивными операциями',
      'Используйте команды просмотра перед удалением'
    ],
    { category: 'system' }
  ));

  // ===========================================
  // Сетевые команды
  // ===========================================
  rules.push(new PatternSecurityRule(
    'network_commands',
    'Потенциально опасные сетевые команды',
    'high',
    [
      /\b(wget|curl).*\|\s*(bash|sh|python|node)/i,
      /\bnc\s+-l\s+-p/i,
      /\bnetcat.*-e/i,
      /\bsocat.*exec/i,
      /\b(ssh|ftp|sftp)\b/i,
      /\b(telnet|rsh|rlogin)\b/i
    ],
    [
      'Загружайте файлы на диск перед выполнением',
      'Проверяйте содержимое загруженных файлов',
      'Используйте официальные пакетные менеджеры',
      'Рассмотрите использование безопасных протоколов'
    ],
    { category: 'network' }
  ));

  // ===========================================
  // Модификация системы
  // ===========================================
  rules.push(new PatternSecurityRule(
    'system_modification',
    'Модификация конфигурации системы',
    'high',
    [
      /\b(chmod\s+777|chmod\s+-R\s+777)/i,
      /\b(chown\s+-R\s+root)/i,
      /\buseradd.*-p/i,
      /\bpasswd.*--stdin/i,
      /\bgpasswd\s+-a/i,
      /\b(attrib\s+[+-][hsr])\b/i,
      /\b(cacls|icacls)\b/i
    ],
    [
      'Используйте минимально необходимые права доступа',
      'Проверьте процедуры управления пользователями',
      'Рассмотрите использование ролевого доступа',
      'Используйте более безопасные альтернативы'
    ],
    { category: 'system' }
  ));

  // ===========================================
  // Манипуляция процессами
  // ===========================================
  rules.push(new PatternSecurityRule(
    'process_manipulation',
    'Команды манипуляции процессами',
    'medium',
    [
      /\bkill\s+-9\s+1\b/i,
      /\bkillall\s+-9/i,
      /\bpkill\s+-f/i,
      /\btaskkill\s+\/f\s+\/im\s+explorer/i,
      /\b(rundll32\s+shell32)\b/i
    ],
    [
      'Используйте graceful завершение процессов',
      'Идентифицируйте конкретные процессы перед завершением',
      'Рассмотрите процедуры перезапуска процессов',
      'Проверьте зависимости перед завершением'
    ],
    { category: 'process' }
  ));

  // ===========================================
  // Манипуляция окружением
  // ===========================================
  rules.push(new PatternSecurityRule(
    'environment_manipulation',
    'Манипуляция переменными окружения',
    'medium',
    [
      /\bexport\s+PATH=.*:/i,
      /\bPATH=.*:/i,
      /\bLD_LIBRARY_PATH=/i,
      /\bLD_PRELOAD=/i
    ],
    [
      'Используйте абсолютные пути вместо изменения PATH',
      'Проверьте изменения окружения',
      'Рассмотрите использование виртуальных окружений',
      'Используйте локальные переменные окружения'
    ],
    { category: 'environment' }
  ));

  // ===========================================
  // Выполнение кода
  // ===========================================
  rules.push(new PatternSecurityRule(
    'code_execution',
    'Динамическое выполнение кода',
    'high',
    [
      /\beval\s*\(/i,
      /\beval\b/i,
      /\bexec\s*\(/i,
      /\b(python|node|php)\s+-c\s+.*[;&|]/i,
      /\bsh\s+-c\s+.*[;&|]/i
    ],
    [
      'Используйте статическое выполнение кода',
      'Проверяйте входные данные перед выполнением',
      'Рассмотрите более безопасные альтернативы',
      'Используйте санитизацию входных данных'
    ],
    { category: 'code' }
  ));

  // ===========================================
  // Интерактивные команды
  // ===========================================
  rules.push(new PatternSecurityRule(
    'interactive_commands',
    'Интерактивные команды',
    'medium',
    [
      /\b(read|more|less|nano|vi|vim)\b/i,
      /\b(ssh|telnet|ftp)\b/i
    ],
    [
      'Используйте cat или type для просмотра файлов',
      'Рассмотрите неинтерактивные альтернативы',
      'Используйте автоматизированные скрипты',
      'Проверьте возможность пакетного режима'
    ],
    { category: 'interactive' }
  ));

  // ===========================================
  // Функциональное правило для проверки длины
  // ===========================================
  rules.push(new FunctionSecurityRule(
    'command_length',
    'Проверка длины команды',
    'medium',
    (command: string) => command.length > 10000,
    (command: string) => [
      `Команда слишком длинная (${command.length} символов)`,
      'Разделите команду на несколько частей',
      'Используйте скрипты для сложных операций',
      'Рассмотрите использование файлов конфигурации'
    ],
    [],
    { category: 'validation' }
  ));

  // ===========================================
  // Функциональное правило для проверки пустых команд
  // ===========================================
  rules.push(new FunctionSecurityRule(
    'empty_command',
    'Проверка пустых команд',
    'low',
    (command: string) => !command || command.trim().length === 0,
    () => [
      'Укажите команду для выполнения',
      'Проверьте синтаксис команды',
      'Используйте справку для получения информации о командах'
    ],
    [],
    { category: 'validation' }
  ));

  // ===========================================
  // Функциональное правило для проверки подозрительных символов
  // ===========================================
  rules.push(new FunctionSecurityRule(
    'suspicious_characters',
    'Проверка подозрительных символов',
    'high',
    (command: string) => {
      const suspiciousPatterns = [
        /\$\{.*\}/, // Shell parameter expansion
        /\$\(.*\)/, // Command substitution
        /`.*`/,     // Backticks
        /\|\s*[a-z]+\s*\|/, // Pipeline with unknown commands
        /;\s*[a-z]+\s*;/,   // Multiple commands
        /&&\s*[a-z]+\s*&&/, // Logical AND
        /\|\|\s*[a-z]+\s*\|\|/ // Logical OR
      ];
      return suspiciousPatterns.some(pattern => pattern.test(command));
    },
    (command: string) => [
      'Обнаружены подозрительные символы в команде',
      'Проверьте команду на наличие инъекций',
      'Используйте экранирование для специальных символов',
      'Рассмотрите использование параметризованных команд'
    ],
    [],
    { category: 'injection' }
  ));

  return rules;
}

/**
 * Создает OS-специфичные правила
 */
export function createOSSpecificRules(): Array<PatternSecurityRule> {
  const rules: PatternSecurityRule[] = [];
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // Windows-специфичные правила
    rules.push(new PatternSecurityRule(
      'windows_critical',
      'Критические Windows команды',
      'critical',
      [
        /\b(format\s+[a-z]:)\b/i,
        /\b(del\s+\/s\s+[a-z]:\\windows)\b/i,
        /\b(reg\s+add\s+HKLM)\b/i,
        /\b(wmic\s+process\s+where)\b/i,
        /\b(rundll32\s+shell32)\b/i,
        /\b(taskkill\s+\/f\s+\/im\s+explorer)\b/i
      ],
      [
        'Операции форматирования запрещены',
        'Изменение системного реестра ограничено',
        'Используйте безопасные альтернативы',
        'Проверьте права доступа перед выполнением'
      ],
      { category: 'windows' }
    ));
  } else {
    // Unix/Linux-специфичные правила
    rules.push(new PatternSecurityRule(
      'unix_critical',
      'Критические Unix команды',
      'critical',
      [
        /\b(rm\s+-rf\s+\/)\b/i,
        /\b(dd\s+if=\/dev\/zero)\b/i,
        /\b(mkfs\s+\/dev\/)\b/i,
        /\b(fdisk\s+\/dev\/)\b/i,
        /\b(chmod\s+777\s+\/)\b/i,
        /\b(chown\s+root\s+\/)\b/i
      ],
      [
        'Операции с корневой файловой системой запрещены',
        'Используйте безопасные альтернативы',
        'Проверьте права доступа',
        'Рассмотрите использование контейнеров'
      ],
      { category: 'unix' }
    ));
  }

  return rules;
}

/**
 * Создает правила для MCP-специфичных команд
 */
export function createMCPRules(): Array<PatternSecurityRule> {
  return [
    new PatternSecurityRule(
      'mcp_tool_execution',
      'Выполнение MCP инструментов',
      'medium',
      [
        /\bmcp\s+tool\s+execute/i,
        /\bmcp\s+resource\s+read/i,
        /\bmcp\s+notification\s+send/i
      ],
      [
        'Проверьте права доступа к MCP инструментам',
        'Убедитесь в безопасности выполняемых операций',
        'Используйте валидацию входных данных',
        'Логируйте все MCP операции'
      ],
      { category: 'mcp' }
    )
  ];
}
