const fs = require('fs');
const { FileSystemUtils } = require('C:/apps/libs/app-framework/core/file-utils/file-system/index.js');
const { SystemInfoCollector } = require('C:/apps/libs/app-framework/system-utils/system-info/index.js');

class TaskReportGenerator {
  constructor(logger = console) {
    this.logger = logger;
    this.fileSystem = new FileSystemUtils(logger);
    this.systemInfo = new SystemInfoCollector(logger);
  }

  /**
   * Обрабатывает результат чейна и создает MD задачи
   */
  async processChainResult(chainName, exitCode, chainOutput, chainRules, workDirectory) {
    this.logger.log(`🔍 Обработка результата: ${chainName}, код: ${exitCode}`);
    
    // Находим правило для кода статуса
    const statusRule = chainRules.rule_sets.find(rule => rule.status_code === exitCode);
    
    if (!statusRule) {
      this.logger.log(`⚠️  Правило для кода ${exitCode} не найдено`);
      return true; // Продолжаем выполнение
    }
    
    this.logger.log(`✅ Найдено правило: ${statusRule.status_name}, действие: ${statusRule.action}`);
    
    // Определяем действие
    const taskAction = statusRule.task_action;
    const taskType = statusRule.task_type;
    
    if (taskAction === 'create') {
      // Создаем MD задачу
      const taskFileName = `${chainName}-${taskType}.md`;
      const taskFilePath = this.fileSystem.join(workDirectory, taskFileName);
      
      this.logger.log(`📝 Создание MD задачи: ${taskFileName}`);
      
      try {
        const taskContent = this.generateMarkdownTask(chainName, exitCode, statusRule, chainOutput);
        
        await this.fileSystem.writeFile(taskFilePath, taskContent);
        this.logger.log(`✅ Задача создана: ${taskFileName}`);
        
      } catch (error) {
        this.logger.error(`❌ Ошибка создания задачи: ${error.message}`);
      }
    } else if (taskAction === 'clear') {
      // Очищаем задачу
      const taskFileName = `${chainName}-${taskType}.md`;
      const taskFilePath = this.fileSystem.join(workDirectory, taskFileName);
      
      if (await this.fileSystem.exists(taskFilePath)) {
        await this.fileSystem.deleteFile(taskFilePath);
        this.logger.log(`🧹 Задача очищена: ${taskFileName}`);
      }
    }
    
    // Возвращаем флаг продолжения
    return statusRule.continue_on_error;
  }

  /**
   * Генерирует MD задачу с полными логами и информацией об окружении
   */
  generateMarkdownTask(chainName, exitCode, statusRule, chainOutput) {
    const timestamp = new Date().toISOString();
    const statusName = statusRule.status_name;
    const logLevel = statusRule.log_level;
    const action = statusRule.action;
    const taskType = statusRule.task_type;
    const taskPriority = statusRule.task_priority;
    
    // Получаем информацию об окружении
    const envInfo = this.systemInfo.getEnvironmentInfo();
    
    let markdown = `# Задача: ${chainName} - ${statusName}\n\n`;
    markdown += `## 📋 Основная информация\n\n`;
    markdown += `- **Чейн**: \`${chainName}\`\n`;
    markdown += `- **Код статуса**: \`${exitCode}\`\n`;
    markdown += `- **Статус**: \`${statusName}\`\n`;
    markdown += `- **Уровень лога**: \`${logLevel}\`\n`;
    markdown += `- **Действие**: \`${action}\`\n`;
    markdown += `- **Тип задачи**: \`${taskType}\`\n`;
    markdown += `- **Приоритет**: \`${taskPriority}\`\n`;
    markdown += `- **Время создания**: \`${timestamp}\`\n\n`;
    
    // Добавляем детали выполнения
    if (chainOutput) {
      markdown += `## 📊 Детали выполнения\n\n`;
      markdown += `- **Время выполнения**: \`${chainOutput.executionTime}ms\`\n`;
      markdown += `- **Код выхода**: \`${chainOutput.exitCode}\`\n`;
      markdown += `- **Статус завершения**: \`${statusName}\`\n\n`;
    }
    
    // Добавляем информацию о месте выполнения
    if (chainOutput) {
      markdown += `## 📁 Место выполнения\n\n`;
      markdown += `- **Рабочая директория**: \`${chainOutput.workingDirectory}\`\n`;
      markdown += `- **Путь к чейну**: \`${chainOutput.chainPath}\`\n`;
      markdown += `- **Скрипт чейна**: \`${chainOutput.scriptPath}\`\n`;
      markdown += `- **Текущая директория**: \`${process.cwd()}\`\n\n`;
    }
    
    // Добавляем информацию об окружении
    markdown += `## 🌍 Информация об окружении\n\n`;
    markdown += `- **ОС**: \`${envInfo.platform} ${envInfo.arch} (${envInfo.release})\`\n`;
    markdown += `- **Хост**: \`${envInfo.hostname}\`\n`;
    markdown += `- **Пользователь**: \`${envInfo.username}\`\n`;
    markdown += `- **Node.js**: \`${envInfo.nodeVersion}\`\n`;
    markdown += `- **Путь к Node.js**: \`${envInfo.nodeExecPath}\`\n`;
    markdown += `- **PID процесса**: \`${envInfo.pid}\`\n`;
    markdown += `- **Переменные окружения**:\n`;
    markdown += `  - **NODE_ENV**: \`${envInfo.env.NODE_ENV}\`\n`;
    markdown += `  - **PATH**: \`${envInfo.env.PATH}\`\n`;
    markdown += `  - **USERPROFILE**: \`${envInfo.env.USERPROFILE}\`\n`;
    markdown += `  - **TEMP**: \`${envInfo.env.TEMP}\`\n`;
    markdown += `- **Время запуска**: \`${envInfo.startTime}\`\n`;
    markdown += `- **Время работы**: \`${envInfo.uptime.toFixed(2)}s\`\n\n`;
    
    // Добавляем логи чейна
    if (chainOutput && (chainOutput.stdout || chainOutput.stderr)) {
      markdown += `## 📝 Логи выполнения чейна\n\n`;
      
      if (chainOutput.stdout) {
        markdown += `### Стандартный вывод (stdout)\n`;
        markdown += `\`\`\`\n${chainOutput.stdout}\n\`\`\`\n\n`;
      }
      
      if (chainOutput.stderr) {
        markdown += `### Ошибки (stderr)\n`;
        markdown += `\`\`\`\n${chainOutput.stderr}\n\`\`\`\n\n`;
      }
    }
    
    markdown += `## 🔧 Рекомендации по исправлению\n\n`;
    markdown += `1. **Проверить логи** чейна \`${chainName}\` (см. выше)\n`;
    markdown += `2. **Анализировать код выхода** \`${exitCode}\`\n`;
    markdown += `3. **Проверить пути** к файлам чейна (см. раздел "Место выполнения")\n`;
    markdown += `4. **Исправить ошибку** согласно сообщению в stderr\n`;
    markdown += `5. **Протестировать исправление** локально\n\n`;
    
    markdown += `## 📊 Контекст выполнения\n\n`;
    markdown += `- **Статус**: ${statusRule.continue_on_error ? 'Продолжение выполнения' : 'Остановка выполнения'}\n`;
    markdown += `- **Влияние**: ${statusRule.continue_on_error ? 'Минимальное' : 'Критическое'}\n`;
    markdown += `- **Требует внимания**: ${taskPriority === 'highest' ? 'Немедленно' : 'В ближайшее время'}\n\n`;
    
    markdown += `## 📝 Следующие шаги\n\n`;
    if (statusRule.continue_on_error) {
      markdown += `1. **Продолжить выполнение** следующих чейнов\n`;
      markdown += `2. **Мониторить логи** на предмет повторения ошибки\n`;
      markdown += `3. **Исправить проблему** в фоновом режиме\n`;
    } else {
      markdown += `1. **ОСТАНОВИТЬ выполнение** всех последующих чейнов\n`;
      markdown += `2. **НЕМЕДЛЕННО исправить** критическую ошибку\n`;
      markdown += `3. **Перезапустить цепочку** после исправления\n`;
    }
    
    markdown += `\n---\n`;
    markdown += `**Сгенерировано автоматически**: ${timestamp}\n`;
    markdown += `**Источник**: Simple Universal Runner v1.0.0\n`;
    
    return markdown;
  }
}

export { TaskReportGenerator };
