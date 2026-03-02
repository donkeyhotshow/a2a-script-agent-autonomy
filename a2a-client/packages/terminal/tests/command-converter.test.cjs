'use strict';

/**
 * Unit tests for command-converter.cjs
 * Tests the command conversion functionality
 */

const {CommandConverter, commandConverter} = require('../src/command-converter.cjs');
const {describe, it} = require('node:test');
const assert = require('node:assert');

describe('CommandConverter', () => {

    describe('isEmulatedCommand', () => {

        it('should return true for set_project_workspace', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('set_project_workspace'), true);
        });

        it('should return true for get_project_workspace', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('get_project_workspace'), true);
        });

        it('should return true for set_mode', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('set_mode'), true);
        });

        it('should return true for show_history', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('show_history'), true);
        });

        it('should return true for read_file', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('read_file'), true);
        });

        it('should return true for list_dir', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('list_dir'), true);
        });

        it('should return false for regular commands', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('ls'), false);
            assert.strictEqual(CommandConverter.isEmulatedCommand('cd'), false);
            assert.strictEqual(CommandConverter.isEmulatedCommand('echo hello'), false);
        });

        it('should return false for empty command', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand(''), false);
            assert.strictEqual(CommandConverter.isEmulatedCommand(null), false);
            assert.strictEqual(CommandConverter.isEmulatedCommand(undefined), false);
        });

        it('should handle command with extra spaces', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('  set_project_workspace  '), true);
            assert.strictEqual(CommandConverter.isEmulatedCommand('  read_file  '), true);
        });

        it('should be case insensitive', () => {
            assert.strictEqual(CommandConverter.isEmulatedCommand('SET_PROJECT_WORKSPACE'), true);
            assert.strictEqual(CommandConverter.isEmulatedCommand('Set_Project_Workspace'), true);
        });
    });

    describe('convertToMCPTool', () => {

        it('should convert set_project_workspace', () => {
            const result = commandConverter.convertToMCPTool('set_project_workspace C:/test');
            assert.strictEqual(result.tool, 'terminal');
            assert.strictEqual(result.action, 'workspace');
            assert.strictEqual(result.subAction, 'set');
        });

        it('should convert get_project_workspace', () => {
            const result = commandConverter.convertToMCPTool('get_project_workspace');
            assert.strictEqual(result.tool, 'terminal');
            assert.strictEqual(result.action, 'workspace');
            assert.strictEqual(result.subAction, 'get');
        });

        it('should convert get_mode', () => {
            const result = commandConverter.convertToMCPTool('get_mode');
            assert.strictEqual(result.tool, 'terminal');
            assert.strictEqual(result.action, 'mode');
            assert.strictEqual(result.subAction, 'get');
        });

        it('should convert set_mode', () => {
            const result = commandConverter.convertToMCPTool('set_mode test');
            assert.strictEqual(result.tool, 'terminal');
            assert.strictEqual(result.action, 'mode');
            assert.strictEqual(result.subAction, 'set');
        });

        it('should convert show_history', () => {
            const result = commandConverter.convertToMCPTool('show_history 10');
            assert.strictEqual(result.tool, 'terminal');
            assert.strictEqual(result.action, 'history');
            assert.strictEqual(result.subAction, 'show');
        });

        it('should convert read_file', () => {
            const result = commandConverter.convertToMCPTool('read_file path/to/file.txt');
            assert.strictEqual(result.tool, 'file');
            assert.strictEqual(result.action, 'file');
            assert.strictEqual(result.subAction, 'read');
        });

        it('should convert list_dir', () => {
            const result = commandConverter.convertToMCPTool('list_dir ./src');
            assert.strictEqual(result.tool, 'file');
            assert.strictEqual(result.action, 'file');
            assert.strictEqual(result.subAction, 'list');
        });

        it('should return null for non-emulated commands', () => {
            const result = commandConverter.convertToMCPTool('ls -la');
            assert.strictEqual(result, null);
        });

        it('should return null for empty command', () => {
            const result = commandConverter.convertToMCPTool('');
            assert.strictEqual(result, null);
        });
    });

    describe('listEmulatedCommands', () => {

        it('should return array of emulated commands', () => {
            const commands = CommandConverter.listEmulatedCommands();
            assert.ok(Array.isArray(commands));
            assert.ok(commands.length > 0);
            assert.ok(commands.includes('set_project_workspace'));
            assert.ok(commands.includes('read_file'));
            assert.ok(commands.includes('list_dir'));
        });
    });

    describe('getSupportedCommands', () => {

        it('should return list of supported commands', () => {
            const commands = commandConverter.getSupportedCommands();
            assert.ok(Array.isArray(commands));
            assert.ok(commands.includes('set_project_workspace'));
        });
    });

    describe('addCommandMapping', () => {

        it('should add new command mapping', () => {
            const initialLength = commandConverter.getSupportedCommands().length;

            commandConverter.addCommandMapping('my_custom_command', {
                tool: 'terminal',
                action: 'custom',
                subAction: 'run',
                paramMapping: (args) => ({command: args.command})
            });

            const newLength = commandConverter.getSupportedCommands().length;
            assert.strictEqual(newLength, initialLength + 1);

            // Cleanup
            commandConverter.removeCommandMapping('my_custom_command');
        });
    });

    describe('removeCommandMapping', () => {

        it('should remove command mapping', () => {
            // First add
            commandConverter.addCommandMapping('temp_command', {
                tool: 'terminal',
                action: 'temp',
                subAction: 'run',
                paramMapping: () => ({})
            });

            const lengthBefore = commandConverter.getSupportedCommands().length;

            // Then remove
            commandConverter.removeCommandMapping('temp_command');

            const lengthAfter = commandConverter.getSupportedCommands().length;
            assert.strictEqual(lengthAfter, lengthBefore - 1);
        });
    });
});
