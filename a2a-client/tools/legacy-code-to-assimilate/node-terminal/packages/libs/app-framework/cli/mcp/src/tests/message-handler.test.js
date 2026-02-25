const MessageHandler = require('../message-handler');

describe('MessageHandler', () => {
    let messageHandler;
    let mockHandler;

    beforeEach(() => {
        messageHandler = new MessageHandler();
        mockHandler = jest.fn();
    });

    describe('constructor', () => {
        test('should initialize with empty handlers map', () => {
            expect(messageHandler.handlers).toBeInstanceOf(Map);
            expect(messageHandler.handlers.size).toBe(0);
        });
    });

    describe('registerHandler', () => {
        test('should register new handler', () => {
            messageHandler.registerHandler('test-type', mockHandler);
            expect(messageHandler.handlers.get('test-type')).toBe(mockHandler);
        });

        test('should override existing handler for same type', () => {
            const firstHandler = jest.fn();
            const secondHandler = jest.fn();

            messageHandler.registerHandler('test-type', firstHandler);
            messageHandler.registerHandler('test-type', secondHandler);

            expect(messageHandler.handlers.get('test-type')).toBe(secondHandler);
            expect(messageHandler.handlers.size).toBe(1);
        });
    });

    describe('handleMessage', () => {
        test('should call registered handler with message', async () => {
            const testMessage = { type: 'test-type', data: 'test-data' };
            const expectedResponse = { success: true };
            mockHandler.mockResolvedValue(expectedResponse);

            messageHandler.registerHandler('test-type', mockHandler);
            const response = await messageHandler.handleMessage(testMessage);

            expect(mockHandler).toHaveBeenCalledWith(testMessage);
            expect(response).toEqual(expectedResponse);
        });

        test('should return error for unregistered message type', async () => {
            const testMessage = { type: 'unknown-type', data: 'test-data' };
            const response = await messageHandler.handleMessage(testMessage);

            expect(response).toEqual({ error: 'No handler for message type' });
        });

        test('should propagate handler errors', async () => {
            const testMessage = { type: 'test-type', data: 'test-data' };
            const testError = new Error('Handler error');
            mockHandler.mockRejectedValue(testError);

            messageHandler.registerHandler('test-type', mockHandler);

            await expect(messageHandler.handleMessage(testMessage))
                .rejects.toThrow(testError);
        });
    });
});
