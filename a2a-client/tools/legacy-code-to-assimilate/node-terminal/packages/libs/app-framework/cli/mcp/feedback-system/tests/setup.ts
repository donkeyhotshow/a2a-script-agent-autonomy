// Test setup file for feedback-system
// This file runs before all tests

// Set up global test environment
beforeAll(() => {
    // Set timezone for consistent date handling
    process.env.TZ = 'UTC';
    
    // Mock console methods to reduce noise during tests
    if (process.env.NODE_ENV === 'test') {
        global.console = {
            ...console,
            // Uncomment to suppress console output during tests
            // log: jest.fn(),
            // warn: jest.fn(),
            // error: jest.fn(),
        };
    }
});

// Clean up after all tests
afterAll(() => {
    // Restore original console if needed
    if (process.env.NODE_ENV === 'test') {
        // Restore console methods
    }
});

// Global test utilities
global.testUtils = {
    // Generate test data
    generateTestSuggestion: (overrides = {}) => ({
        id: 'test-id',
        suggestion: 'Test suggestion',
        user: 'testuser',
        category: 'general',
        type: 'feedback',
        status: 'new',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        votes: 0,
        tags: [],
        targetService: 'project-feedback',
        pluginName: 'test-plugin',
        projectPath: 'c:/test/project',
        ...overrides
    }),
    
    // Generate multiple test suggestions
    generateTestSuggestions: (count, overrides = {}) => 
        Array(count).fill(null).map((_, index) => 
            global.testUtils.generateTestSuggestion({
                id: `s${index}`,
                suggestion: `Test suggestion ${index}`,
                user: `user${index % 10}`,
                ...overrides
            })
        ),
    
    // Wait for async operations
    waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Mock file system operations
    mockFileSystem: (operations = {}) => {
        const fs = require('fs');
        const originalMethods = {};
        
        Object.keys(operations).forEach(method => {
            if (fs[method]) {
                originalMethods[method] = fs[method];
                fs[method] = jest.fn().mockImplementation(operations[method]);
            }
        });
        
        return {
            restore: () => {
                Object.keys(originalMethods).forEach(method => {
                    fs[method] = originalMethods[method];
                });
            }
        };
    }
};

// Extend Jest matchers
expect.extend({
    toBeValidSuggestion(received) {
        const requiredFields = [
            'id', 'suggestion', 'user', 'category', 'type', 'status', 'priority',
            'createdAt', 'updatedAt', 'votes', 'tags', 'targetService', 'pluginName', 'projectPath'
        ];
        
        const missingFields = requiredFields.filter(field => !(field in received));
        
        if (missingFields.length === 0) {
            return {
                message: () => `Expected ${received} to be a valid suggestion`,
                pass: true,
            };
        } else {
            return {
                message: () => `Expected ${received} to be a valid suggestion, but missing fields: ${missingFields.join(', ')}`,
                pass: false,
            };
        }
    },
    
    toBeValidSuggestionResponse(received) {
        if (received && typeof received === 'object' && 'success' in received) {
            if (received.success === true) {
                if ('suggestion' in received && received.suggestion) {
                    return {
                        message: () => `Expected ${received} to be a valid suggestion response`,
                        pass: true,
                    };
                } else {
                    return {
                        message: () => `Expected ${received} to have a suggestion property when success is true`,
                        pass: false,
                    };
                }
            } else {
                if ('error' in received && received.error) {
                    return {
                        message: () => `Expected ${received} to be a valid suggestion response`,
                        pass: true,
                    };
                } else {
                    return {
                        message: () => `Expected ${received} to have an error property when success is false`,
                        pass: false,
                    };
                }
            }
        } else {
            return {
                message: () => `Expected ${received} to be a valid suggestion response with success property`,
                pass: false,
            };
        }
    }
});

// Type declarations for custom matchers
declare global {
    namespace jest {
        interface Matchers<R> {
            toBeValidSuggestion(): R;
            toBeValidSuggestionResponse(): R;
        }
    }
}
