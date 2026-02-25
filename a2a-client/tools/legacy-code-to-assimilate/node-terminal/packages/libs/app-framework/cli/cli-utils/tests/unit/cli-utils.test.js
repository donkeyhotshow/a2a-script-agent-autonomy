const { printServerResult, runAndPrint } = require('../../index');

describe('CLI Utils', () => {
  let logSpy;
  let errorSpy;
  let exitSpy;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  describe('printServerResult', () => {
    it('should print the text content if available', () => {
      const result = {
        result: {
          content: [{ text: 'Hello from server' }]
        }
      };
      printServerResult(result);
      expect(logSpy).toHaveBeenCalledWith('Hello from server');
    });

    it('should print JSON string if text content is not available', () => {
      const result = {
        status: 'success',
        data: { value: 123 }
      };
      printServerResult(result);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(result, null, 2));
    });

    it('should handle null or undefined results gracefully', () => {
      printServerResult(null);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(null, null, 2));
      logSpy.mockClear();
      printServerResult(undefined);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(undefined, null, 2));
    });
  });

  describe('runAndPrint', () => {
    it('should execute the executor and print the result on success', async () => {
      const mockResult = { status: 'ok' };
      const executor = jest.fn().mockResolvedValue(mockResult);
      await runAndPrint(executor);
      expect(executor).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2));
      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });

    it('should catch errors, print an error message, and exit on failure', async () => {
      const errorMessage = 'Something went wrong';
      const error = new Error(errorMessage);
      const executor = jest.fn().mockRejectedValue(error);
      await runAndPrint(executor);
      expect(executor).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(`❌ ${errorMessage}`);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions gracefully', async () => {
      const error = 'Just a string error';
      const executor = jest.fn().mockRejectedValue(error);
      await runAndPrint(executor);
      expect(executor).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(`❌ ${String(error)}`);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
