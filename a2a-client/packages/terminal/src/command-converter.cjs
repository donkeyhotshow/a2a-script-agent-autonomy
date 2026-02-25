#!/usr/bin/env node

/**
 * CommandConverter - модуль для конвертации старых команд в новые модульные команды
 * Обеспечивает обратную совместимость и плавную миграцию
 */

class CommandConverter {
    constructor() {
        // Таблица соответствия старых команд новым модульным командам
        this.commandMappings = {
            // Старые команды рабочей директории
            'set_project_workspace': {
                tool: 'terminal',
                action: 'workspace',
                subAction: 'set',
                paramMapping: (args) => ({
                    command: args.workspace || args.path || args[0]
                })
            },
            'get_project_workspace': {
                tool: 'terminal',
                action: 'workspace',
                subAction: 'get',
                paramMapping: () => ({})
            },

            // Старые команды режима
            'set_mode': {
                tool: 'terminal',
                action: 'mode',
                subAction: 'set',
                paramMapping: (args) => ({
                    command: args.mode || args.name || args[0]
                })
            },
            'get_mode': {
                tool: 'terminal',
                action: 'mode',
                subAction: 'get',
                paramMapping: () => ({})
            },

            // Старые команды истории
            'show_history': {
                tool: 'terminal',
                action: 'history',
                subAction: 'show',
                paramMapping: (args) => ({
                    limit: args.limit || args.count || 10
                })
            },
            'list_sessions': {
                tool: 'terminal',
                action: 'history',
                subAction: 'list',
                paramMapping: () => ({})
            },

            // Старые команды файловой системы
            'read_file': {
                tool: 'file',
                action: 'file',
                subAction: 'read',
                paramMapping: (args) => ({
                    path: args.path || args.file || args[0]
                })
            },
            'list_dir': {
                tool: 'file',
                action: 'file',
                subAction: 'list',
                paramMapping: (args) => ({
                    path: args.path || args.dir || args[0] || '.',
                    recursive: args.recursive || false
                })
            },
            'write_file': {
                tool: 'file',
                action: 'file',
                subAction: 'write',
                paramMapping: (args) => ({
                    path: args.path || args.file || args[0],
                    content: args.content || args.data || args[1],
                    append: args.append || false
                })
            },

            // Старые команды поиска
            'grep_search': {
                tool: 'search',
                action: 'search',
                subAction: 'find',
                paramMapping: (args) => ({
                    query: args.pattern || args.query || args[0],
                    path: args.path || args.dir || '.',
                    case_insensitive: args.case_insensitive || args.i || false,
                    multiline: args.multiline || false
                })
            },

            // Старые команды тестирования
            'run_tests': {
                tool: 'test',
                action: 'test',
                subAction: 'run',
                paramMapping: (args) => ({
                    suite: args.suite || args.type || 'unit',
                    file: args.file || args.pattern
                })
            }
        };

        // Список эмулированных команд (старые команды, которые конвертируются)
        this.emulatedCommands = Object.keys(this.commandMappings);
    }

    /**
     * Проверяет, является ли команда эмулированной (старой командой, которая должна быть конвертирована)
     * @param {string} command - Команда для проверки
     * @returns {boolean} - true если команда эмулированная
     */
    static isEmulatedCommand(command) {
        if (!command || typeof command !== 'string') {
            return false;
        }

        const cmd = command.trim().toLowerCase();

        // Проверяем точное совпадение
        if (commandConverter.emulatedCommands.includes(cmd)) {
            return true;
        }

        // Проверяем частичное совпадение для команд с параметрами
        for (const emulatedCmd of commandConverter.emulatedCommands) {
            if (cmd.startsWith(emulatedCmd + ' ') || cmd === emulatedCmd) {
                return true;
            }
        }

        return false;
    }

    /**
     * Конвертирует старую команду в новый формат MCP tool
     * @param {string} command - Старая команда для конвертации
     * @returns {object|null} - Конвертированный объект или null если конвертация невозможна
     */
    convertToMCPTool(command) {
        if (!command || typeof command !== 'string') {
            return null;
        }

        const cmd = command.trim();
        const parts = cmd.split(/\s+/);
        const baseCommand = parts[0].toLowerCase();

        // Ищем соответствие в таблице маппинга
        const mapping = this.commandMappings[baseCommand];
        if (!mapping) {
            return null;
        }

        try {
            // Парсим параметры команды
            const args = this._parseCommandArgs(cmd);
            const params = mapping.paramMapping ? mapping.paramMapping(args) : {};

            return {
                tool: mapping.tool,
                action: mapping.action,
                subAction: mapping.subAction,
                params: params
            };
        } catch (error) {
            console.error(`Error converting command "${command}":`, error.message);
            return null;
        }
    }

    /**
     * Парсит аргументы команды из строки
     * @param {string} command - Команда с аргументами
     * @returns {object} - Распарсенные аргументы
     */
    _parseCommandArgs(command) {
        const parts = command.split(/\s+/);
        const args = {};

        // Первый элемент - сама команда
        args.command = parts[0];

        // Парсим остальные аргументы
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];

            // Обработка флагов
            if (part.startsWith('--')) {
                const flagName = part.slice(2);
                if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
                    args[flagName] = parts[i + 1];
                    i++; // Пропускаем следующую часть, так как она значение флага
                } else {
                    args[flagName] = true;
                }
            } else if (part.startsWith('-')) {
                // Короткие флаги
                const flagName = part.slice(1);
                if (i + 1 < parts.length && !parts[i + 1].startsWith('-')) {
                    args[flagName] = parts[i + 1];
                    i++;
                } else {
                    args[flagName] = true;
                }
            } else {
                // Позиционные аргументы
                args[i - 1] = part;
            }
        }

        return args;
    }

    /**
     * Получает список всех поддерживаемых эмулированных команд
     * @returns {string[]} - Массив поддерживаемых команд
     */
    getSupportedCommands() {
        return [...this.emulatedCommands];
    }

    /**
     * Добавляет новую конвертацию команды
     * @param {string} oldCommand - Старая команда
     * @param {object} mapping - Маппинг для новой команды
     */
    addCommandMapping(oldCommand, mapping) {
        this.commandMappings[oldCommand] = mapping;
        this.emulatedCommands = Object.keys(this.commandMappings);
    }

    /**
     * Удаляет конвертацию команды
     * @param {string} command - Команда для удаления
     */
    removeCommandMapping(command) {
        delete this.commandMappings[command];
        this.emulatedCommands = Object.keys(this.commandMappings);
    }
}

// Статические методы для обратной совместимости
CommandConverter.isEmulatedCommand = function (command) {
    if (!command || typeof command !== 'string') {
        return false;
    }

    const cmd = command.trim().toLowerCase();

    // Список всех эмулированных команд
    const emulatedCommands = [
        'set_project_workspace', 'get_project_workspace', 'set_mode', 'get_mode',
        'show_history', 'list_sessions', 'read_file', 'list_dir', 'write_file',
        'grep_search', 'run_tests'
    ];

    // Проверяем точное совпадение
    if (emulatedCommands.includes(cmd)) {
        return true;
    }

    // Проверяем частичное совпадение для команд с параметрами
    for (const emulatedCmd of emulatedCommands) {
        if (cmd.startsWith(emulatedCmd + ' ') || cmd === emulatedCmd) {
            return true;
        }
    }

    return false;
};

CommandConverter.convertToMCPTool = function (command) {
    const instance = new CommandConverter();
    return instance.convertToMCPTool(command);
};

CommandConverter.convertCommand = CommandConverter.convertToMCPTool; // Для обратной совместимости

// Метод для получения списка всех эмулированных команд
CommandConverter.listEmulatedCommands = function () {
    return [
        'set_project_workspace', 'get_project_workspace', 'set_mode', 'get_mode',
        'show_history', 'list_sessions', 'read_file', 'list_dir', 'write_file',
        'grep_search', 'run_tests'
    ];
};

// Создаем глобальный экземпляр для нестатических методов
const commandConverter = new CommandConverter();

// Экспортируем класс и экземпляр
module.exports = {
    CommandConverter,
    commandConverter
};
