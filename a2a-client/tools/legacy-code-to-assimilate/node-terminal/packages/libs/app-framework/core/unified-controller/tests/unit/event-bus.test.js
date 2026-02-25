import eventBus, { SimpleEventBus } from '../../src/event-bus.js';

describe('SimpleEventBus', () => {
  let bus;
  let consoleErrorSpy;

  beforeEach(() => {
    bus = new SimpleEventBus();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('должен инициализироваться с пустым объектом событий', () => {
    expect(bus.events).toEqual({});
  });

  test('должен регистрировать обработчик событий с помощью метода on', () => {
    const handler = jest.fn();
    bus.on('testEvent', handler);
    expect(bus.events.testEvent).toBeDefined();
    expect(bus.events.testEvent.length).toBe(1);
    expect(bus.events.testEvent[0]).toBe(handler);
  });

  test('должен регистрировать несколько обработчиков для одного события', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on('testEvent', handler1);
    bus.on('testEvent', handler2);
    expect(bus.events.testEvent.length).toBe(2);
    expect(bus.events.testEvent[0]).toBe(handler1);
    expect(bus.events.testEvent[1]).toBe(handler2);
  });

  test('должен вызывать обработчик событий при вызове emit', () => {
    const handler = jest.fn();
    bus.on('testEvent', handler);
    const data = { message: 'Hello' };
    bus.emit('testEvent', data);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(data);
  });

  test('должен вызывать все обработчики событий при вызове emit', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on('testEvent', handler1);
    bus.on('testEvent', handler2);
    const data = { message: 'Hello' };
    bus.emit('testEvent', data);
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler1).toHaveBeenCalledWith(data);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith(data);
  });

  test('не должен вызывать обработчики для несуществующих событий', () => {
    const handler = jest.fn();
    bus.on('testEvent', handler);
    bus.emit('nonExistentEvent', {});
    expect(handler).not.toHaveBeenCalled();
  });

  test('должен удалять конкретный обработчик событий с помощью метода off', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on('testEvent', handler1);
    bus.on('testEvent', handler2);
    bus.off('testEvent', handler1);
    expect(bus.events.testEvent.length).toBe(1);
    expect(bus.events.testEvent[0]).toBe(handler2);
  });

  test('должен удалять все обработчики для события, если обратный вызов не указан', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    bus.on('testEvent', handler1);
    bus.on('testEvent', handler2);
    bus.off('testEvent');
    expect(bus.events.testEvent).toBeUndefined();
  });

  test('не должен выбрасывать ошибку при попытке удалить несуществующее событие', () => {
    expect(() => bus.off('nonExistentEvent')).not.toThrow();
  });

  test('должен обрабатывать ошибки в обработчиках событий при emit', () => {
    const failingHandler = jest.fn(() => { throw new Error('Handler error'); });
    const successfulHandler = jest.fn();
    bus.on('testEvent', failingHandler);
    bus.on('testEvent', successfulHandler);

    bus.emit('testEvent', {});

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successfulHandler).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Error in event handler for 'testEvent':"), expect.any(Error));
  });

  test('должен очищать все зарегистрированные события с помощью метода clear', () => {
    bus.on('event1', jest.fn());
    bus.on('event2', jest.fn());
    bus.clear();
    expect(bus.events).toEqual({});
  });
});

describe('Global EventBus instance', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Сбрасываем глобальный eventBus перед каждым тестом
    eventBus.clear();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('глобальный eventBus должен быть экземпляром SimpleEventBus', () => {
    expect(eventBus).toBeInstanceOf(SimpleEventBus);
  });

  test('глобальный eventBus должен работать как обычный EventBus', () => {
    const handler = jest.fn();
    eventBus.on('globalEvent', handler);
    const data = { source: 'global' };
    eventBus.emit('globalEvent', data);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(data);
  });

  test('глобальный eventBus должен очищать свои события', () => {
    eventBus.on('tempEvent', jest.fn());
    eventBus.clear();
    expect(eventBus.events).toEqual({});
  });
});
