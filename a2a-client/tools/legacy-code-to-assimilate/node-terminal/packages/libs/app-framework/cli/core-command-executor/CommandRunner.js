import { execa } from 'execa';
import { AppError, TimeoutError, CommandExecutionError } from './CommandErrors.js';
import { CommandState } from './CommandEnums.js';

/**
 * Исполнитель команд
 */
class CommandRunner {
  constructor(config) {
    this.config = config;
  }

  /**
   * Выполнение команды с защитой от таймаута
   */
  async executeWithTimeout(context) {
    const { request, abortController } = context;
    const timeout = request.timeout || this.config.server.timeout;

    try {
      const subprocess = execa(request.command, {
        shell: true,
        cwd: request.cwd || process.cwd(),
        env: { ...process.env, ...request.env },
        timeout,
        signal: abortController.signal,
        all: true,
      });

      context.setSubprocess(subprocess);

      // Сбор вывода
      if (subprocess.stdout) {
        subprocess.stdout.on('data', (chunk) => {
          const data = chunk.toString();
          context.appendStdout(data);
        });
      }

      if (subprocess.stderr) {
        subprocess.stderr.on('data', (chunk) => {
          const data = chunk.toString();
          context.appendStderr(data);
        });
      }

      const result = await subprocess;

      return {
        id: context.id,
        command: request.command,
        success: true,
        exitCode: result.exitCode,
        stdout: context.stdout,
        stderr: context.stderr,
        duration: context.getDuration(),
        timestamp: context.startTime,
        metadata: {
          platform: process.platform,
          cwd: request.cwd || process.cwd(),
          killed: result.killed,
          timedOut: result.timedOut,
          pid: result.pid,
          state: context.state
        },
      };

    } catch (error) {
      if (abortController.signal.aborted) {
        throw new AppError('Command was cancelled', 'COMMAND_CANCELLED', 400);
      }

      if (error && typeof error === 'object' && 'exitCode' in error) {
        const execaError = error;
        if (execaError.timedOut) {
          throw new TimeoutError(`Command timed out after ${timeout}ms`);
        }

        return {
          id: context.id,
          command: request.command,
          success: false,
          exitCode: execaError.exitCode,
          stdout: context.stdout,
          stderr: context.stderr || execaError.message,
          duration: context.getDuration(),
          timestamp: context.startTime,
          metadata: {
            platform: process.platform,
            cwd: request.cwd || process.cwd(),
            killed: execaError.killed,
            timedOut: execaError.timedOut,
            pid: execaError.pid,
            signal: execaError.signal,
            state: context.state
          },
        };
      }

      throw new CommandExecutionError(
        'Command execution failed',
        'COMMAND_EXECUTION_ERROR',
        500,
        { originalError: error }
      );
    }
  }

  /**
   * Выполнение команды с потоковым выводом
   */
  async executeStreamInternal(context, stream, emitStdout, emitStderr) {
    const { request, abortController } = context;
    const timeout = request.timeout || this.config.server.timeout;

    try {
      const subprocess = execa(request.command, {
        shell: true,
        cwd: request.cwd || process.cwd(),
        env: { ...process.env, ...request.env },
        timeout,
        signal: abortController.signal,
        all: true,
        buffer: false,
      });

      context.setSubprocess(subprocess);

      // Потоковый вывод stdout
      if (subprocess.stdout) {
        subprocess.stdout.on('data', (chunk) => {
          const data = chunk.toString();
          context.appendStdout(data);
          emitStdout({ id: context.id, data });
        });
      }

      // Потоковый вывод stderr
      if (subprocess.stderr) {
        subprocess.stderr.on('data', (chunk) => {
          const data = chunk.toString();
          context.appendStderr(data);
          emitStderr({ id: context.id, data });
        });
      }

      // Ожидание завершения
      const result = await subprocess;

      // Финальный результат
      const finalResult = {
        id: context.id,
        command: request.command,
        success: true,
        exitCode: result.exitCode,
        stdout: context.stdout,
        stderr: context.stderr,
        duration: context.getDuration(),
        timestamp: context.startTime,
        metadata: {
          platform: process.platform,
          cwd: request.cwd || process.cwd(),
          killed: result.killed,
          timedOut: result.timedOut,
          pid: result.pid,
          state: context.state
        },
      };

      stream.emit('complete', finalResult);
      stream.emit('close');

    } catch (error) {
      stream.emit('error', error);
      stream.emit('close');
    }
  }
}

export { CommandRunner };
