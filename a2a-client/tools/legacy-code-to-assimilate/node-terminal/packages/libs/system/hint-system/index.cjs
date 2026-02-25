/**
 * Система хинтов для MCP сервера
 * Предоставляет подсказки и предотвращает цикличность команд
 */

// Простая реализация системы хинтов
class HintSystem {
  constructor() {
    this.commandHistory = new Map();
    this.cycleThreshold = 3;
    this.cooldownMs = 30000; // 30 секунд
  }

  checkCommand(sessionId, tool, action, args = []) {
    const commandKey = tool + ':' + action;
    const sessionKey = sessionId || 'default';
    
    if (!this.commandHistory.has(sessionKey)) {
      this.commandHistory.set(sessionKey, new Map());
    }
    
    const sessionHistory = this.commandHistory.get(sessionKey);
    const now = Date.now();
    
    if (!sessionHistory.has(commandKey)) {
      sessionHistory.set(commandKey, {
        count: 0,
        lastUsed: 0,
        cooldownUntil: 0
      });
    }
    
    const commandData = sessionHistory.get(commandKey);
    
    // Проверяем кулдаун
    if (now < commandData.cooldownUntil) {
      return {
        isCycling: true,
        count: commandData.count,
        commandKey: commandKey,
        cooldownUntil: commandData.cooldownUntil,
        suggestions: this.generateSuggestions(tool, action)
      };
    }
    
    // Обновляем счетчик
    commandData.count++;
    commandData.lastUsed = now;
    
    // Если превышен порог, устанавливаем кулдаун
    if (commandData.count >= this.cycleThreshold) {
      commandData.cooldownUntil = now + this.cooldownMs;
      commandData.count = 0;
    }
    
    return {
      isCycling: false,
      count: commandData.count,
      commandKey: commandKey,
      cooldownUntil: commandData.cooldownUntil,
      suggestions: []
    };
  }

  generateSuggestions(tool, action) {
    const suggestions = [];
    
    // Базовые подсказки для разных инструментов
    switch (tool) {
      case 'terminal':
        suggestions.push('Попробуйте использовать более специфичные команды');
        suggestions.push('Проверьте синтаксис команды');
        break;
      case 'file':
        suggestions.push('Убедитесь, что файл существует');
        suggestions.push('Проверьте права доступа к файлу');
        break;
      case 'search':
        suggestions.push('Используйте более точные поисковые запросы');
        suggestions.push('Попробуйте другой формат поиска');
        break;
      default:
        suggestions.push('Попробуйте другой подход к решению задачи');
    }
    
    return suggestions;
  }

  getCycleStats(sessionId) {
    const sessionKey = sessionId || 'default';
    const sessionHistory = this.commandHistory.get(sessionKey);
    
    if (!sessionHistory) {
      return { totalCommands: 0, uniqueCommands: 0, cycling: [] };
    }
    
    let totalCommands = 0;
    const cycling = [];
    
    for (const [commandKey, data] of sessionHistory.entries()) {
      totalCommands += data.count;
      if (data.count >= this.cycleThreshold) {
        cycling.push({
          command: commandKey,
          count: data.count,
          cooldownUntil: data.cooldownUntil
        });
      }
    }
    
    return {
      totalCommands: totalCommands,
      uniqueCommands: sessionHistory.size,
      cycling: cycling
    };
  }

  clearCycleHistory(sessionId) {
    if (sessionId) {
      this.commandHistory.delete(sessionId);
    } else {
      this.commandHistory.clear();
    }
  }

  cleanup() {
    const now = Date.now();
    
    for (const [sessionKey, sessionHistory] of this.commandHistory.entries()) {
      for (const [commandKey, data] of sessionHistory.entries()) {
        // Удаляем старые записи (старше 1 часа)
        if (now - data.lastUsed > 3600000) {
          sessionHistory.delete(commandKey);
        }
      }
      
      // Удаляем пустые сессии
      if (sessionHistory.size === 0) {
        this.commandHistory.delete(sessionKey);
      }
    }
  }
}

// Создаем глобальный экземпляр
const hintSystem = new HintSystem();

// Экспортируем функции
module.exports = {
  hintSystem,
  checkCommandCycle: (sessionId, tool, action, args = []) => 
    hintSystem.checkCommand(sessionId, tool, action, args),
  getCycleStats: (sessionId) => hintSystem.getCycleStats(sessionId),
  clearCycleHistory: (sessionId) => hintSystem.clearCycleHistory(sessionId),
  cleanupHintSystem: () => hintSystem.cleanup()
};
