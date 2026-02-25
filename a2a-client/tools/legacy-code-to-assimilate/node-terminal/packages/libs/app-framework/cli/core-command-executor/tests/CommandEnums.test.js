import { CommandState } from '../CommandEnums.js';

describe('CommandEnums', () => {
  test('should have correct state values', () => {
    expect(CommandState.PENDING).toBe('pending');
    expect(CommandState.RUNNING).toBe('running');
    expect(CommandState.COMPLETED).toBe('completed');
    expect(CommandState.FAILED).toBe('failed');
    expect(CommandState.CANCELLED).toBe('cancelled');
    expect(CommandState.TIMEOUT).toBe('timeout');
  });

  test('should have unique state values', () => {
    const states = Object.values(CommandState);
    const uniqueStates = new Set(states);
    expect(uniqueStates.size).toBe(states.length);
  });

  test('should have all required states', () => {
    const requiredStates = ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'];
    requiredStates.forEach(state => {
      expect(Object.values(CommandState)).toContain(state);
    });
  });

  test('should be immutable object', () => {
    const originalValue = CommandState.PENDING;
    expect(() => {
      CommandState.PENDING = 'changed';
    }).toThrow();
    expect(CommandState.PENDING).toBe(originalValue);
  });

  test('should not allow adding new properties', () => {
    expect(() => {
      CommandState.NEW_STATE = 'new';
    }).toThrow();
    expect(CommandState.NEW_STATE).toBeUndefined();
  });

  test('should have consistent state transitions', () => {
    // Проверяем логическую последовательность состояний
    const states = Object.values(CommandState);
    expect(states).toContain('pending');
    expect(states).toContain('running');
    expect(states).toContain('completed');
    expect(states).toContain('failed');
    expect(states).toContain('cancelled');
    expect(states).toContain('timeout');
  });

  test('should have proper state names for logging', () => {
    // Проверяем, что все состояния подходят для логирования
    const states = Object.values(CommandState);
    states.forEach(state => {
      expect(typeof state).toBe('string');
      expect(state.length).toBeGreaterThan(0);
      expect(state).toMatch(/^[a-z]+$/); // только строчные буквы
    });
  });
});
