const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const CommandExecutor = require('../src/command-executor');

// Mock dependencies
const mockLogger = {
    warn: sinon.spy(),
    debug: sinon.spy(),
};
const mockErrorHandler = sinon.spy();
const mockHistoryManager = sinon.spy();

describe('CommandExecutor', () => {
    let commandExecutor;

    beforeEach(() => {
        commandExecutor = new CommandExecutor(mockLogger, mockErrorHandler, mockHistoryManager);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create logs directory if it does not exist', () => {
        const mkdirSyncStub = sinon.stub(require('fs'), 'mkdirSync');
        mkdirSyncStub.returns(true);

        const logsDir = commandExecutor.ensureLogsDir();

        expect(mkdirSyncStub.calledOnce).to.be.true;
        expect(logsDir).to.include('logs');
    });

    it('should build shell and args for Windows', () => {
        sinon.stub(process, 'platform').value('win32');
        const command = 'echo Hello';

        const result = commandExecutor.buildShellAndArgs(command);
        console.log('Result:', result);

        expect(result.options.shell).to.equal('cmd.exe');
        expect(result.file).to.equal(command);
    });

    it('should build shell and args for non-Windows', () => {
        sinon.stub(process, 'platform').value('linux');
        sinon.stub(commandExecutor, 'isWindows').value(false);
        const command = 'echo Hello';

        const result = commandExecutor.buildShellAndArgs(command);
        console.log('Result:', result);

        expect(result.file).to.equal('/bin/bash');
        expect(result.args).to.deep.equal(['-lc', command]);
    });
});
