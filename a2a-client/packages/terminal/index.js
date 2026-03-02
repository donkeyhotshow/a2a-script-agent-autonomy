'use strict';

/**
 * Terminal Module - Main Entry Point
 *
 * Exports all terminal-related functionality:
 * - Command execution
 * - Terminal handler with pre/post processing
 * - Command conversion
 */

const {TerminalHandler} = require('./src/terminal-handler.cjs');
const {CommandExecutor} = require('./src/command-executor-wrapper.cjs');
const {CommandConverter, commandConverter} = require('./src/command-converter.cjs');
const {
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
} = require('./src/terminal-handler-core.cjs');

module.exports = {
    // Main handler
    TerminalHandler,

    // Command execution
    CommandExecutor,

    // Command conversion
    CommandConverter,
    commandConverter,

    // Core utilities
    resolvePathCore,
    analyzeDirectoryChangeCore,
    shouldPersistHistoryCore,
    checkHistoryLimitCore
};
