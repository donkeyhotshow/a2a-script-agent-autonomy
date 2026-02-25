const fs = require('fs').promises;
const path = require('path');

class HistoryManager {
    constructor(sessionsDir, logger, options = {}) {
        this.sessionsDir = sessionsDir;
        this.logger = logger;
        
        // Настройки ограничений
        this.maxRecordsPerSession = options.maxRecordsPerSession || 1000;
        this.maxLogFileSize = options.maxLogFileSize || 10 * 1024 * 1024;
        this.cleanupInterval = options.cleanupInterval || 60 * 60 * 1000;
        this.autoCleanup = options.autoCleanup !== false;
        
        if (this.autoCleanup) {
            this.startAutoCleanup();
        }
    }

    async logCommand(commandData) {
        const sessionId = commandData.session_id || 'default_session';
        const sessionPath = path.join(this.sessionsDir, sessionId);
        const logFilePath = path.join(sessionPath, 'session.log.jsonl');
        const successLogFilePath = path.join(sessionPath, 'by_error', 'success.jsonl');
        const errorLogFilePath = path.join(sessionPath, 'by_error', 'nonzero_exit.jsonl');

        try {
            await fs.mkdir(path.join(sessionPath, 'by_error'), { recursive: true });
            const logEntry = JSON.stringify(commandData) + '\n';
            
            await fs.appendFile(logFilePath, logEntry);

            if (commandData.success) {
                await fs.appendFile(successLogFilePath, logEntry);
            } else {
                await fs.appendFile(errorLogFilePath, logEntry);
            }

            this.logger.debug('Команда залогирована в историю', commandData);
        } catch (error) {
            this.logger.error('Ошибка при логировании команды в историю:', error);
        }
    }

    async getCommandHistory(sessionId, limit = 10) {
        const sessionPath = path.join(this.sessionsDir, sessionId);
        const logFilePath = path.join(sessionPath, 'session.log.jsonl');

        try {
            const data = await fs.readFile(logFilePath, 'utf-8');
            const lines = data.split('\n').filter(Boolean);
            return lines.slice(-limit).map(line => JSON.parse(line));
        } catch (error) {
            this.logger.warn(`Не удалось прочитать историю команд для сессии ${sessionId}:`, error.message);
            return [];
        }
    }

    async analyzeCommand(command) {
        this.logger.debug('Анализ команды:', command);
        
        const hints = [];
        
        if (command.includes('git')) {
            hints.push('💡 Git команды: используйте --help для справки');
            if (command.includes('status')) {
                hints.push('💡 Попробуйте: git log --oneline для просмотра истории');
            }
        }
        
        if (command.includes('npm')) {
            hints.push('💡 NPM команды: используйте --verbose для подробного вывода');
            if (command.includes('install')) {
                hints.push('💡 Попробуйте: npm audit для проверки безопасности');
            }
        }
        
        if (command.includes('node')) {
            hints.push('💡 Node.js: используйте --inspect для отладки');
        }
        
        if (command.includes('nonexistent') || command.includes('not found')) {
            hints.push('🔍 Проверьте правильность написания команды');
            hints.push('🔍 Убедитесь, что команда установлена в системе');
        }
        
        return hints;
    }

    startAutoCleanup() {
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    async cleanup() {
        try {
            const sessions = await fs.readdir(this.sessionsDir);
            for (const sessionId of sessions) {
                await this.cleanupSession(sessionId);
            }
        } catch (error) {
            this.logger.error('Ошибка при очистке сессий:', error);
        }
    }

    async cleanupSession(sessionId) {
        const sessionPath = path.join(this.sessionsDir, sessionId);
        const logFilePath = path.join(sessionPath, 'session.log.jsonl');

        try {
            const stats = await fs.stat(logFilePath);
            if (stats.size > this.maxLogFileSize) {
                await this.truncateLogFile(logFilePath);
            }
        } catch (error) {
            this.logger.error(`Ошибка при очистке сессии ${sessionId}:`, error);
        }
    }

    async truncateLogFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            const newLines = lines.slice(-this.maxRecordsPerSession);
            await fs.writeFile(filePath, newLines.join('\n') + '\n');
        } catch (error) {
            this.logger.error(`Ошибка при обрезке файла ${filePath}:`, error);
        }
    }
}

export default HistoryManager;
