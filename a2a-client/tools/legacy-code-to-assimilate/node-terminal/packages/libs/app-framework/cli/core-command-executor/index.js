/**
 * Core Command Executor - Система выполнения команд с мониторингом
 * Предоставляет полную систему выполнения, отмены и мониторинга команд
 */

import { execa } from 'execa';
import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import StructuredLogger from './StructuredLogger.js';
import { CommandState } from './CommandEnums.js';
import { AppError, TimeoutError, CommandExecutionError } from './CommandErrors.js';
import { ExecutionContext } from './ExecutionContext.js';
import { CommandValidator } from './CommandValidator.js';
import { CommandRunner } from './CommandRunner.js';

/**
 * Основной исполнитель команд
 */
class CommandExecutor extends EventEmitter {
  constructor(config = {}, logger = console) {
    super();
    
    this.config = {
      security: {
        maxCommandLength: 10000,
        allowedCommands: [],
        blockedCommands: []
      },
      server: {
        timeout: 30000, // 30 секунд по умолчанию
        maxConcurrentCommands: 10
      },
      ...config
    };

    this.logger = logger;
    this.structuredLogger = new StructuredLogger(logger);
    this.commandValidator = new CommandValidator(this.config);
    this.commandRunner = new CommandRunner(this.config);
    
    this.activeCommands = new Map();
    this.commandHistory = [];
    this.maxHistorySize = 1000;
  }

  /**
   * Выполнение команды с полным мониторингом
   */
  async execute(request) {
    const id = nanoid();
    const startTime = new Date();
    
    this.structuredLogger.logCommand({
      id,
      command: request.command,
      state: CommandState.PENDING,
      duration: 0,
      exitCode: 0,
    });

    // Валидация запроса
    this.commandValidator.validateRequest(request);

    // Проверка лимита одновременных команд
    if (this.activeCommands.size >= this.config.server.maxConcurrentCommands) {
      throw new AppError(
        `Maximum concurrent commands limit reached (${this.config.server.maxConcurrentCommands})`,
        'CONCURRENT_LIMIT_EXCEEDED',
        429
      );
    }

    // Создание контекста выполнения
    const context = new ExecutionContext(id, request);
    this.activeCommands.set(id, context);

    try {
      // Обновление состояния
      context.updateState(CommandState.RUNNING);
      
      this.structuredLogger.logCommand({
        id,
        command: request.command,
        state: CommandState.RUNNING,
        duration: 0,
        exitCode: 0,
      });

      // Выполнение с таймаутом
      const result = await this.commandRunner.executeWithTimeout(context);
      
      // Обновление состояния
      context.updateState(result.success ? CommandState.COMPLETED : CommandState.FAILED);
      
      this.structuredLogger.logCommand({
        id,
        command: request.command,
        state: result.success ? CommandState.COMPLETED : CommandState.FAILED,
        duration: result.duration,
        exitCode: result.exitCode,
      });

      // Добавление в историю
      this.addToHistory(result);

      // Эмиссия события
      this.emit('commandCompleted', result);

      return result;

    } catch (error) {
      // Обработка ошибок
      const state = error instanceof TimeoutError ? CommandState.TIMEOUT : CommandState.FAILED;
      context.updateState(state);

      const errorResult = {
        id,
        command: request.command,
        success: false,
        exitCode: -1,
        stdout: context.stdout,
        stderr: context.stderr || (error instanceof Error ? error.message : String(error)),
        duration: context.getDuration(),
        timestamp: startTime,
        metadata: {
          platform: process.platform,
          cwd: request.cwd || process.cwd(),
          killed: context.abortController.signal.aborted,
          timedOut: error instanceof TimeoutError,
          pid: context.subprocess?.pid,
          error: error.message,
          errorCode: error.code
        },
      };

      this.structuredLogger.logCommand({
        id,
        command: request.command,
        state,
        duration: errorResult.duration,
        exitCode: errorResult.exitCode,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      // Добавление в историю
      this.addToHistory(errorResult);

      // Эмиссия события
      this.emit('commandFailed', errorResult);
      throw error;

    } finally {
      // Очистка
      this.activeCommands.delete(id);
    }
  }

  /**
   * Выполнение команды с потоковым выводом
   */
  executeStream(request) {
    const id = nanoid();
    const context = new ExecutionContext(id, request);
    
    this.activeCommands.set(id, context);

    const stream = new EventEmitter();

    // Выполнение в фоне
    this.commandRunner.executeStreamInternal(context, stream, this.emit.bind(this, 'stdout'), this.emit.bind(this, 'stderr')).catch(error => {
      stream.emit('error', error);
    });

    // Очистка при отписке
    stream.on('close', () => {
      context.abortController.abort();
      this.activeCommands.delete(id);
    });

    return stream;
  }

  /**
   * Отмена выполняющейся команды
   */
  async cancel(id) {
    const context = this.activeCommands.get(id);
    
    if (!context) {
      return false;
    }

    context.abortController.abort();
    context.updateState(CommandState.CANCELLED);

    // Принудительное завершение процесса
    if (context.subprocess) {
      try {
        context.subprocess.kill('SIGTERM');
        setTimeout(() => {
          if (context.subprocess && !context.subprocess.killed) {
            context.subprocess.kill('SIGKILL');
          }
        }, 5000);
      } catch (error) {
        this.logger.warn(`Failed to kill subprocess for command ${id}:`, error.message);
      }
    }

    this.structuredLogger.logCommand({
      id,
      command: context.request.command,
      state: CommandState.CANCELLED,
      duration: context.getDuration(),
      exitCode: 0,
    });

    this.emit('commandCancelled', { id, command: context.request.command });
    return true;
  }

  /**
   * Получение списка активных команд
   */
  getActiveCommands() {
    return Array.from(this.activeCommands.keys());
  }

  /**
   * Получение статуса команды
   */
  getCommandStatus(id) {
    const context = this.activeCommands.get(id);
    return context ? context.state : null;
  }

  /**
   * Получение контекста команды
   */
  getCommandContext(id) {
    return this.activeCommands.get(id);
  }

  /**
   * Получение истории команд
   */
  getCommandHistory(limit = 100) {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Очистка истории команд
   */
  clearHistory() {
    this.commandHistory = [];
  }

  /**
   * Получение статистики
   */
  getStats() {
    const stats = {
      activeCommands: this.activeCommands.size,
      totalHistory: this.commandHistory.length,
      maxConcurrentCommands: this.config.server.maxConcurrentCommands,
      timeout: this.config.server.timeout,
      maxCommandLength: this.config.security.maxCommandLength
    };

    // Статистика по состояниям
    const stateStats = {};
    this.commandHistory.forEach(cmd => {
      const state = cmd.metadata?.state || 'unknown';
      stateStats[state] = (stateStats[state] || 0) + 1;
    });

    stats.stateStats = stateStats;
    return stats;
  }

  /**
   * Добавление результата в историю
   */
  addToHistory(result) {
    this.commandHistory.push({
      ...result,
      metadata: {
        ...result.metadata,
        state: result.success ? CommandState.COMPLETED : CommandState.FAILED
      }
    });

    // Ограничение размера истории
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
    }
  }
}

export { CommandExecutor,
  AppError,
  TimeoutError,
  CommandExecutionError };
