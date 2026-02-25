require('module-alias/register');
// Исправляем путь - используем CommonJS версию command-utils
const COMMAND_UTILS_PATH = 'C:/apps/libs/app-framework/cli/command-utils/index.cjs';
const { runCommand, ProcessManager, CatEmulator, BackgroundExecutor, CommandExecutor, InputProcessor, isPowerShellCommand } = require(COMMAND_UTILS_PATH);

module.exports = {
	runCommand,
	ProcessManager,
	CatEmulator,
	BackgroundExecutor,
	CommandExecutor,
	InputProcessor,
	isPowerShellCommand
};
