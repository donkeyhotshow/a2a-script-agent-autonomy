/**
 * Unified Daemon - Унифицированная система управления демонами
 * Версия: 1.0.0
 * Интеграция с Ticket System
 */

// const { UnifiedDaemonManager } = require('./UnifiedDaemonManager'); // Временно закомментировано для тестирования
// const { DaemonProcessManager } = require('./DaemonProcessManager'); // Временно закомментировано для тестирования
const { PidFileManager } = require('./PidFileManager');
// const { DaemonConfigManager } = require('./DaemonConfigManager'); // Временно закомментировано для тестирования
// const { DaemonCLI } = require('./DaemonCLI'); // Временно закомментировано для тестирования

/**
 * Основной класс Unified Daemon
 */
class UnifiedDaemon {
  constructor(options = {}) {
    this.options = {
      pidFilePath: options.pidFilePath || 'C:/apps/data/unified-daemon-pids.json',
      maxConcurrentDaemons: options.maxConcurrentDaemons || 10,
      autoRestart: options.autoRestart !== false,
      monitoringInterval: options.monitoringInterval || 5000,
      ...options
    };

    // this.manager = new UnifiedDaemonManager(options); // Временно закомментировано для тестирования
    // this.processManager = new DaemonProcessManager(options); // Временно закомментировано для тестирования
    this.pidManager = new PidFileManager(this.options.pidFilePath);
    // this.configManager = new DaemonConfigManager(options); // Временно закомментировано для тестирования
    // this.cli = new DaemonCLI(this); // Временно закомментировано для тестирования

    this.isRunning = false;
    this.stats = {
      totalDaemons: 0,
      runningDaemons: 0,
      stoppedDaemons: 0,
      failedDaemons: 0
    };
  }

  /**
   * Инициализация системы
   */
  async initialize() {
    try {
      await this.pidManager.initialize();
      // await this.configManager.load(); // Временно закомментировано для тестирования
      // await this.manager.initialize(); // Временно закомментировано для тестирования

      console.log('✅ Unified Daemon инициализирован');
      return true;
    } catch (error) {
      console.error('❌ Ошибка инициализации Unified Daemon:', error);
      throw error;
    }
  }

  /**
   * Запуск демона по имени
   */
  async startDaemon(daemonName, config = {}) {
    try {
      // Проверяем, не запущен ли уже демон
      const existingDaemon = await this.pidManager.getDaemon(daemonName);
      if (existingDaemon && existingDaemon.status === 'running') {
        console.log(`⚠️ Демон ${daemonName} уже запущен (PID: ${existingDaemon.pid})`);
        return existingDaemon;
      }

      // Если демон запущен, но нужно перезапустить
      if (existingDaemon) {
        await this.stopDaemon(daemonName);
      }

      // Получаем конфигурацию демона
      const daemonConfig = await this.configManager.getDaemonConfig(daemonName, config);
      
      // Создаем тикет для демона
      const ticket = await this.manager.createDaemonTicket(daemonName, daemonConfig);
      
      // Запускаем демон через тикет
      const result = await this.manager.startTicket(ticket.id);
      
      console.log(`✅ Демон ${daemonName} запущен (Ticket: ${ticket.id})`);
      return result;
    } catch (error) {
      console.error(`❌ Ошибка запуска демона ${daemonName}:`, error);
      throw error;
    }
  }

  /**
   * Остановка демона
   */
  async stopDaemon(daemonName) {
    try {
      const existingDaemon = await this.pidManager.getDaemon(daemonName);
      if (!existingDaemon) {
        console.log(`ℹ️ Демон ${daemonName} не найден`);
        return null;
      }

      // Останавливаем через тикет
      const ticket = await this.manager.getTicketByDaemon(daemonName);
      if (ticket) {
        await this.manager.stopTicket(ticket.id);
      }

      // Останавливаем процесс
      await this.processManager.stopProcess(existingDaemon.pid);
      
      // Обновляем PID файл
      await this.pidManager.updateDaemonStatus(daemonName, 'stopped');
      
      console.log(`🛑 Демон ${daemonName} остановлен`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка остановки демона ${daemonName}:`, error);
      throw error;
    }
  }

  /**
   * Перезапуск демона
   */
  async restartDaemon(daemonName) {
    try {
      console.log(`🔄 Перезапуск демона ${daemonName}...`);
      
      await this.stopDaemon(daemonName);
      
      // Ждем немного перед запуском
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.startDaemon(daemonName);
      
      console.log(`✅ Демон ${daemonName} перезапущен`);
      return true;
    } catch (error) {
      console.error(`❌ Ошибка перезапуска демона ${daemonName}:`, error);
      throw error;
    }
  }

  /**
   * Получение статуса демона
   */
  async getDaemonStatus(daemonName) {
    try {
      const pidInfo = await this.pidManager.getDaemon(daemonName);
      const ticket = await this.manager.getTicketByDaemon(daemonName);
      
      if (!pidInfo && !ticket) {
        return { status: 'not_found', message: 'Демон не найден' };
      }

      const status = {
        name: daemonName,
        pid: pidInfo?.pid || null,
        status: pidInfo?.status || 'unknown',
        startTime: pidInfo?.startTime || null,
        restartCount: pidInfo?.restartCount || 0
      };

      if (ticket) {
        status.ticket = {
          id: ticket.id,
          status: ticket.status,
          type: ticket.type
        };
      }

      return status;
    } catch (error) {
      console.error(`❌ Ошибка получения статуса демона ${daemonName}:`, error);
      throw error;
    }
  }

  /**
   * Получение статуса всех демонов
   */
  async getAllDaemonsStatus() {
    try {
      const daemons = await this.pidManager.getAllDaemons();
      const statuses = [];

      for (const [name, info] of Object.entries(daemons)) {
        const status = await this.getDaemonStatus(name);
        statuses.push(status);
      }

      return statuses;
    } catch (error) {
      console.error('❌ Ошибка получения статуса всех демонов:', error);
      throw error;
    }
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      ...this.stats,
      pidManager: this.pidManager.getStats(),
      ticketManager: this.manager.getStats()
    };
  }

  /**
   * Запуск системы
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    try {
      await this.initialize();
      
      this.isRunning = true;
      
      // Запускаем мониторинг
      this.monitoringTimer = setInterval(() => {
        this.monitorDaemons();
      }, this.options.monitoringInterval);

      console.log('🚀 Unified Daemon запущен');
    } catch (error) {
      console.error('❌ Ошибка запуска Unified Daemon:', error);
      throw error;
    }
  }

  /**
   * Остановка системы
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;

      if (this.monitoringTimer) {
        clearInterval(this.monitoringTimer);
        this.monitoringTimer = null;
      }

      // Останавливаем все демоны
      const daemons = await this.pidManager.getAllDaemons();
      for (const [name, info] of Object.entries(daemons)) {
        if (info.status === 'running') {
          await this.stopDaemon(name);
        }
      }

      await this.manager.stop();
      
      console.log('🛑 Unified Daemon остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки Unified Daemon:', error);
      throw error;
    }
  }

  /**
   * Мониторинг демонов
   */
  async monitorDaemons() {
    try {
      const daemons = await this.pidManager.getAllDaemons();
      
      for (const [name, info] of Object.entries(daemons)) {
        if (info.status === 'running') {
          // Проверяем, жив ли процесс
          const isAlive = await this.processManager.isProcessAlive(info.pid);
          
          if (!isAlive) {
            console.log(`⚠️ Процесс демона ${name} (PID: ${info.pid}) не отвечает`);
            
            if (this.options.autoRestart) {
              console.log(`🔄 Автоматический перезапуск демона ${name}...`);
              await this.restartDaemon(name);
            } else {
              await this.pidManager.updateDaemonStatus(name, 'failed');
            }
          }
        }
      }

      this.updateStats();
    } catch (error) {
      console.error('❌ Ошибка мониторинга демонов:', error);
    }
  }

  /**
   * Обновление статистики
   */
  updateStats() {
    const daemons = this.pidManager.getAllDaemonsSync();
    
    this.stats = {
      totalDaemons: Object.keys(daemons).length,
      runningDaemons: 0,
      stoppedDaemons: 0,
      failedDaemons: 0
    };

    for (const [name, info] of Object.entries(daemons)) {
      switch (info.status) {
        case 'running':
          this.stats.runningDaemons++;
          break;
        case 'stopped':
          this.stats.stoppedDaemons++;
          break;
        case 'failed':
          this.stats.failedDaemons++;
          break;
      }
    }
  }

  /**
   * Запуск CLI
   */
  async runCLI(args = process.argv.slice(2)) {
    return await this.cli.run(args);
  }
}

// Экспорт основных классов
export { UnifiedDaemon, PidFileManager };


