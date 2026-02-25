const { TimeUtils, timeUtils } = require('../index.js');
const { format } = require('date-fns');

// Мокаем date-fns для стабильности тестов, если это необходимо.
// В данном случае, так как используются реальные Date объекты, мокать можно не везде, но полезно для formatLogTimestamp
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    // Простая имитация форматирования для тестов
    if (formatStr === 'yyyy-MM-dd HH:mm:ss.SSS') {
      return new Date(date).toISOString().replace('T', ' ').replace('Z', '');
    }
    return jest.requireActual('date-fns').format(date, formatStr);
  }),
}));

describe('TimeUtils', () => {
  let timeUtilsInstance;

  beforeEach(() => {
    timeUtilsInstance = new TimeUtils();
    // Фиксируем время для детерминированных тестов
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('formatLogTimestamp', () => {
    test('должен форматировать текущую дату для логов в указанном формате', () => {
      const fixedDate = new Date('2023-01-01T12:30:45.123Z');
      jest.setSystemTime(fixedDate);
      
      const result = timeUtilsInstance.formatLogTimestamp();
      // Ожидаем формат, который возвращает наш мок format из date-fns
      expect(result).toBe('2023-01-01 12:30:45.123');
      expect(format).toHaveBeenCalledWith(fixedDate, 'yyyy-MM-dd HH:mm:ss.SSS');
    });

    test('должен форматировать предоставленную дату для логов', () => {
      const customDate = new Date('2024-02-15T08:00:00.500Z');
      const result = timeUtilsInstance.formatLogTimestamp(customDate);
      expect(result).toBe('2024-02-15 08:00:00.500');
      expect(format).toHaveBeenCalledWith(customDate, 'yyyy-MM-dd HH:mm:ss.SSS');
    });
  });

  describe('formatTime', () => {
    test('should format milliseconds', () => {
      expect(timeUtilsInstance.formatTime(500)).toBe('500ms');
      expect(timeUtilsInstance.formatTime(0)).toBe('0ms');
    });

    test('should format seconds', () => {
      expect(timeUtilsInstance.formatTime(2500)).toBe('2.50s');
      expect(timeUtilsInstance.formatTime(1000)).toBe('1.00s');
      expect(timeUtilsInstance.formatTime(59999)).toBe('60.00s'); // Почти минута
    });

    test('should format minutes', () => {
      expect(timeUtilsInstance.formatTime(90000)).toBe('1.50m');
      expect(timeUtilsInstance.formatTime(60000)).toBe('1.00m');
      expect(timeUtilsInstance.formatTime(3599999)).toBe('60.00m'); // Почти час
    });

    test('should format hours', () => {
      expect(timeUtilsInstance.formatTime(7200000)).toBe('2.00h');
      expect(timeUtilsInstance.formatTime(3600000)).toBe('1.00h');
      expect(timeUtilsInstance.formatTime(86399999)).toBe('24.00h'); // Почти день
    });

    test('should format in detailed mode for hours, minutes, seconds', () => {
      const result = timeUtilsInstance.formatTime(3661000, 'detailed'); // 1h 1m 1s
      expect(result).toBe('1h 1m 1s');
    });

    test('should format in detailed mode for days, hours, minutes, seconds', () => {
      const result = timeUtilsInstance.formatTime(90061000, 'detailed'); // 1d 1h 1m 1s
      expect(result).toBe('1d 1h 1m 1s');
    });

    test('should format in detailed mode with only seconds', () => {
      expect(timeUtilsInstance.formatTime(5000, 'detailed')).toBe('5s');
    });

    test('should format in detailed mode with only minutes', () => {
      expect(timeUtilsInstance.formatTime(120000, 'detailed')).toBe('2m');
    });

    test('should format 0ms in detailed mode', () => {
      expect(timeUtilsInstance.formatTime(0, 'detailed')).toBe('0s');
    });

    test('should handle negative milliseconds gracefully in auto mode', () => {
      expect(timeUtilsInstance.formatTime(-500)).toBe('-500ms');
      expect(timeUtilsInstance.formatTime(-2500)).toBe('-2.50s');
    });

    test('should handle negative milliseconds gracefully in detailed mode', () => {
      expect(timeUtilsInstance.formatTime(-3661000, 'detailed')).toBe('-1h 1m 1s');
    });
  });

  describe('formatDate', () => {
    const date = new Date('2023-01-01T12:30:45.123Z');

    test('should format date in ISO format', () => {
      const result = timeUtilsInstance.formatDate(date, 'ISO');
      expect(result).toBe(date.toISOString());
    });

    test('should format date in short format', () => {
      const result = timeUtilsInstance.formatDate(date, 'short');
      // Зависит от локали, поэтому проверяем только что не пустая строка
      expect(result).toBe('01.01.2023');
    });

    test('should format date in long format (ru-RU)', () => {
      const result = timeUtilsInstance.formatDate(date, 'long');
      // Зависит от локали, поэтому проверяем только что не пустая строка
      expect(result).toBe('1 января 2023 г., 12:30');
    });

    test('should format date for filename', () => {
      const result = timeUtilsInstance.formatDate(date, 'filename');
      expect(result).toBe('2023-01-01');
    });

    test('should return ISO format by default', () => {
      const result = timeUtilsInstance.formatDate(date);
      expect(result).toBe(date.toISOString());
    });

    test('should handle invalid date input', () => {
      const invalidDate = 'invalid date string';
      const result = timeUtilsInstance.formatDate(invalidDate, 'ISO');
      expect(result).toBe('Invalid Date'); // Behavior of new Date(invalid) toISOString()
    });
  });

  describe('daysBetween', () => {
    test('should calculate days between dates (positive difference)', () => {
      const date1 = new Date('2023-01-01T12:00:00.000Z');
      const date2 = new Date('2023-01-05T12:00:00.000Z');
      const result = timeUtilsInstance.daysBetween(date1, date2);
      expect(result).toBe(4);
    });

    test('should calculate days between dates (negative difference)', () => {
      const date1 = new Date('2023-01-05T12:00:00.000Z');
      const date2 = new Date('2023-01-01T12:00:00.000Z');
      const result = timeUtilsInstance.daysBetween(date1, date2);
      expect(result).toBe(4);
    });

    test('should handle same date', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      const result = timeUtilsInstance.daysBetween(date, date);
      expect(result).toBe(0);
    });

    test('should handle dates spanning daylight saving changes gracefully', () => {
      // This is a tricky one and might require more sophisticated date libraries for perfect accuracy.
      // For basic Date object, it mostly relies on UTC difference if dates are set with Z or UTC methods.
      const dateDSTStart = new Date('2023-03-26T01:00:00.000Z'); // Assume DST starts, clock moves forward by 1h
      const dateAfterDST = new Date('2023-03-27T01:00:00.000Z');
      const result = timeUtilsInstance.daysBetween(dateDSTStart, dateAfterDST);
      expect(result).toBe(1);
    });

    test('should handle dates with different times but same day range', () => {
      const date1 = new Date('2023-01-01T00:00:00.000Z');
      const date2 = new Date('2023-01-01T23:59:59.999Z');
      expect(timeUtilsInstance.daysBetween(date1, date2)).toBe(0);

      const date3 = new Date('2023-01-01T23:00:00.000Z');
      const date4 = new Date('2023-01-02T01:00:00.000Z');
      expect(timeUtilsInstance.daysBetween(date3, date4)).toBe(1);
    });
  });

  describe('addDays', () => {
    test('should add positive days', () => {
      const date = new Date('2023-01-01T12:00:00.000Z');
      const result = timeUtilsInstance.addDays(date, 5);
      expect(result.toISOString()).toBe('2023-01-06T12:00:00.000Z');
    });

    test('should subtract negative days', () => {
      const date = new Date('2023-01-05T12:00:00.000Z');
      const result = timeUtilsInstance.addDays(date, -2);
      expect(result.toISOString()).toBe('2023-01-03T12:00:00.000Z');
    });

    test('should handle month boundaries', () => {
      const date = new Date('2023-01-30T12:00:00.000Z');
      const result = timeUtilsInstance.addDays(date, 5);
      expect(result.toISOString()).toBe('2023-02-04T12:00:00.000Z');
    });

    test('should handle year boundaries', () => {
      const date = new Date('2023-12-30T12:00:00.000Z');
      const result = timeUtilsInstance.addDays(date, 5);
      expect(result.toISOString()).toBe('2024-01-04T12:00:00.000Z');
    });

    test('should not mutate original date object', () => {
      const originalDate = new Date('2023-01-01');
      timeUtilsInstance.addDays(originalDate, 1);
      expect(originalDate.toISOString()).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('wait', () => {
    test('should wait for specified milliseconds', async () => {
      const mockSetTimeout = jest.spyOn(global, 'setTimeout');
      const mockClearTimeout = jest.spyOn(global, 'clearTimeout');

      const promise = timeUtilsInstance.wait(100);

      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 100);

      jest.advanceTimersByTime(100);
      await promise; // Ensure the promise resolves after timeout

      expect(mockClearTimeout).not.toHaveBeenCalled(); // No clearTimeout called for simple wait
    });

    test('should resolve immediately for wait(0)', async () => {
      const mockSetTimeout = jest.spyOn(global, 'setTimeout');
      const startTime = Date.now();
      await timeUtilsInstance.wait(0);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5); // Should be very quick
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 0);
    });
  });

  describe('now and currentDate', () => {
    test('should return current timestamp in milliseconds', () => {
      const fixedTime = 1672531200000; // Jan 1, 2023 12:00:00 AM UTC
      jest.setSystemTime(new Date(fixedTime));
      expect(timeUtilsInstance.now()).toBe(fixedTime);
    });

    test('should return current Date object', () => {
      const fixedDate = new Date('2023-01-01T12:00:00.000Z');
      jest.setSystemTime(fixedDate);
      const current = timeUtilsInstance.currentDate();
      expect(current).toBeInstanceOf(Date);
      expect(current.toISOString()).toBe(fixedDate.toISOString());
    });
  });

  describe('isValidDate', () => {
    test('should validate valid Date objects', () => {
      expect(timeUtilsInstance.isValidDate(new Date())).toBe(true);
      expect(timeUtilsInstance.isValidDate(new Date('2023-01-01'))).toBe(true);
    });

    test('should validate valid date strings/timestamps', () => {
      expect(timeUtilsInstance.isValidDate('2023-01-01T00:00:00Z')).toBe(true);
      expect(timeUtilsInstance.isValidDate(1672531200000)).toBe(true); // Timestamp for 2023-01-01 UTC
    });

    test('should invalidate invalid dates', () => {
      expect(timeUtilsInstance.isValidDate('invalid date string')).toBe(false);
      expect(timeUtilsInstance.isValidDate(null)).toBe(false);
      expect(timeUtilsInstance.isValidDate(undefined)).toBe(false);
      expect(timeUtilsInstance.isValidDate(new Date('invalid'))).toBe(false);
      expect(timeUtilsInstance.isValidDate({})).toBe(false);
      expect(timeUtilsInstance.isValidDate([])).toBe(false);
    });
  });

  describe('timeDiff', () => {
    test('should calculate time difference in milliseconds', () => {
      const date1 = new Date('2023-01-01T12:00:00Z');
      const date2 = new Date('2023-01-01T12:30:00Z');
      const result = timeUtilsInstance.timeDiff(date1, date2);
      expect(result).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });

    test('should handle reverse order (still positive diff)', () => {
      const date1 = new Date('2023-01-01T12:30:00Z');
      const date2 = new Date('2023-01-01T12:00:00Z');
      const result = timeUtilsInstance.timeDiff(date1, date2);
      expect(result).toBe(30 * 60 * 1000);
    });

    test('should return 0 for same dates', () => {
      const date = new Date('2023-01-01T12:00:00Z');
      expect(timeUtilsInstance.timeDiff(date, date)).toBe(0);
    });

    test('should handle invalid date inputs gracefully', () => {
      const date = new Date('2023-01-01');
      expect(isNaN(timeUtilsInstance.timeDiff(date, 'invalid'))).toBe(true);
      expect(isNaN(timeUtilsInstance.timeDiff('invalid', date))).toBe(true);
    });
  });

  describe('formatDuration', () => {
    test('should format duration in seconds', () => {
      expect(timeUtilsInstance.formatDuration(45 * 1000)).toBe('45с');
      expect(timeUtilsInstance.formatDuration(0)).toBe('0с');
      expect(timeUtilsInstance.formatDuration(59 * 1000)).toBe('59с');
    });

    test('should format duration in minutes and seconds', () => {
      expect(timeUtilsInstance.formatDuration(90 * 1000)).toBe('1м 30с');
      expect(timeUtilsInstance.formatDuration(60 * 1000)).toBe('1м 0с');
      expect(timeUtilsInstance.formatDuration(121 * 1000)).toBe('2м 1с');
    });

    test('should format duration in hours, minutes and seconds', () => {
      expect(timeUtilsInstance.formatDuration(3661 * 1000)).toBe('1ч 1м 1с'); // 1 hour, 1 minute, 1 second
      expect(timeUtilsInstance.formatDuration(3600 * 1000)).toBe('1ч 0м 0с');
    });

    test('should format duration in days, hours and minutes', () => {
      expect(timeUtilsInstance.formatDuration(90061 * 1000)).toBe('1д 1ч 1м'); // 1 day, 1 hour, 1 minute, 1 second (seconds truncated)
      expect(timeUtilsInstance.formatDuration(24 * 3600 * 1000)).toBe('1д 0ч 0м');
      expect(timeUtilsInstance.formatDuration(25 * 3600 * 1000)).toBe('1д 1ч 0м');
    });

    test('should handle very large durations', () => {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      expect(timeUtilsInstance.formatDuration(threeDays)).toBe('3д 0ч 0м');
    });

    test('should handle negative durations gracefully (as positive)', () => {
      // Math.abs в formatDuration
      expect(timeUtilsInstance.formatDuration(-45 * 1000)).toBe('45с');
    });
  });

  describe('default instance', () => {
    test('should be instance of TimeUtils', () => {
      expect(timeUtils).toBeInstanceOf(TimeUtils);
    });

    test('default instance methods should work correctly', () => {
      // Проверяем, что методы дефолтного инстанса работают
      jest.setSystemTime(new Date('2023-01-01T12:30:00.000Z'));
      expect(timeUtils.now()).toBe(new Date('2023-01-01T12:30:00.000Z').getTime());
      expect(timeUtils.formatTime(1000)).toBe('1.00s');
    });
  });
});

