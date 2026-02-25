const ConnectionManager = require('../connection-manager');

describe('ConnectionManager', () => {
    let connectionManager;
    let mockConnection;

    beforeEach(() => {
        connectionManager = new ConnectionManager();
        mockConnection = {
            id: 'test-connection',
            send: jest.fn(),
            close: jest.fn()
        };
    });

    describe('constructor', () => {
        test('should initialize with empty connections map', () => {
            expect(connectionManager.connections).toBeInstanceOf(Map);
            expect(connectionManager.connections.size).toBe(0);
        });
    });

    describe('addConnection', () => {
        test('should add new connection', () => {
            connectionManager.addConnection('test-id', mockConnection);
            expect(connectionManager.connections.get('test-id')).toBe(mockConnection);
        });

        test('should override existing connection with same id', () => {
            const firstConnection = { ...mockConnection };
            const secondConnection = { ...mockConnection };

            connectionManager.addConnection('test-id', firstConnection);
            connectionManager.addConnection('test-id', secondConnection);

            expect(connectionManager.connections.get('test-id')).toBe(secondConnection);
            expect(connectionManager.connections.size).toBe(1);
        });
    });

    describe('removeConnection', () => {
        test('should remove existing connection', () => {
            connectionManager.addConnection('test-id', mockConnection);
            connectionManager.removeConnection('test-id');
            expect(connectionManager.connections.has('test-id')).toBe(false);
        });

        test('should not throw when removing non-existent connection', () => {
            expect(() => {
                connectionManager.removeConnection('non-existent-id');
            }).not.toThrow();
        });
    });

    describe('getConnection', () => {
        test('should return connection by id', () => {
            connectionManager.addConnection('test-id', mockConnection);
            const connection = connectionManager.getConnection('test-id');
            expect(connection).toBe(mockConnection);
        });

        test('should return undefined for non-existent connection', () => {
            const connection = connectionManager.getConnection('non-existent-id');
            expect(connection).toBeUndefined();
        });
    });
});
