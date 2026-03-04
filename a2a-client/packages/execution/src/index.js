/**
 * @a2a/execution - Unified execution package
 * 
 * Объединяет:
 * - fs-utils: файловые утилиты (file-scanner, glob-matcher, ignore-detector, protocol-result)
 * - terminal: терминальные функции  
 * - script-runner: выполнение скриптов
 */

// Re-export fs-utils
const fsUtils = require('./index.ts');

// Re-export terminal
const terminal = require('./terminal/terminal-handler.cjs');
const { CommandExecutor } = require('./terminal/command-executor-wrapper.cjs');
const { CommandConverter, commandConverter } = require('./terminal/command-converter.cjs');

// Re-export script-runner
const scriptRunner = require('./script-runner/index.ts');

module.exports = {
  // fs-utils
  ...fsUtils,
  
  // terminal
  TerminalHandler: terminal.TerminalHandler,
  CommandExecutor,
  CommandConverter,
  commandConverter,
  
  // script-runner
  ...scriptRunner,
  
  // Alias for convenience
  terminal: {
    TerminalHandler: terminal.TerminalHandler,
    CommandExecutor,
    CommandConverter,
    commandConverter
  },
  scriptRunner
};
