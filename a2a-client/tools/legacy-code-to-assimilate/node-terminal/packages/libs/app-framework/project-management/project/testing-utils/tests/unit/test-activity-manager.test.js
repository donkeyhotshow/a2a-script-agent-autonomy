const { TestActivityManager } = require('../../test-activity-manager');

describe('TestActivityManager', () => {
  let activityManager;
  let loggerSpy;
  let activityMap;
  let changeHistory;
  let dependencies;
  let testHistory;
  let config;
  let setIntervalSpy; // Declared here to be accessible throughout the describe block

  beforeEach(() => {
    loggerSpy = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    activityMap = new Map();
    changeHistory = new Map();
    dependencies = new Map();
    testHistory = new Map();
    config = {
      activityBoostMultiplier: 2.0
    };

    // Mock setInterval in a way that Jest can spy on it
    setIntervalSpy = jest.spyOn(global, 'setInterval');

    activityManager = new TestActivityManager({
      logger: loggerSpy,
      activityDecayRate: 0.5,
      maxActivityHistory: 3,
      activityBoostMultiplier: 2.0,
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 0, 1, 12, 0, 0)); // Set a fixed time
  });

  afterEach(() => {
    setIntervalSpy.mockRestore(); // Restore original setInterval after each test
    jest.restoreAllMocks(); // Restore all mocks
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultManager = new TestActivityManager();
      expect(defaultManager.logger).toBe(console);
      expect(defaultManager.activityDecayRate).toBe(0.95);
      expect(defaultManager.maxActivityHistory).toBe(100);
      expect(defaultManager.activityBoostMultiplier).toBe(2.0);
    });

    it('should initialize with custom options', () => {
      expect(activityManager.logger).toBe(loggerSpy);
      expect(activityManager.activityDecayRate).toBe(0.5);
      expect(activityManager.maxActivityHistory).toBe(3);
      expect(activityManager.activityBoostMultiplier).toBe(2.0);
    });
  });

  describe('startActivityDecay', () => {
    it('should set up an interval for decaying activity', () => {
      const decayCallback = jest.fn();
      activityManager.startActivityDecay(decayCallback);
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(decayCallback, 30000);
    });
  });

  describe('decayActivity', () => {
    it('should decay activity for all entries in the map', () => {
      activityMap.set('/file1.js', 10);
      activityMap.set('/file2.js', 5);
      changeHistory.set('/file1.js', { lastChange: Date.now() - 60000 }); // 1 minute ago
      changeHistory.set('/file2.js', { lastChange: Date.now() - 120000 }); // 2 minutes ago

      activityManager.decayActivity(activityMap, changeHistory, 0.5); // Decay rate 0.5

      // Expected decay: activity * (0.5 ^ (timeSinceLastChange / 60000))
      // file1: 10 * (0.5 ^ 1) = 5
      // file2: 5 * (0.5 ^ 2) = 1.25

      expect(activityMap.get('/file1.js')).toBeCloseTo(5);
      expect(activityMap.get('/file2.js')).toBeCloseTo(1.25);
    });

    it('should remove entries if activity falls below 0.1', () => {
      activityMap.set('/file1.js', 0.05);
      activityMap.set('/file2.js', 0.2);
      changeHistory.set('/file1.js', { lastChange: Date.now() });
      changeHistory.set('/file2.js', { lastChange: Date.now() });

      activityManager.decayActivity(activityMap, changeHistory, 0.5);
      expect(activityMap.has('/file1.js')).toBe(false);
      expect(changeHistory.has('/file1.js')).toBe(false);
      expect(activityMap.has('/file2.js')).toBe(true);
    });

    it('should not decay activity if no time has passed', () => {
        activityMap.set('/file1.js', 10);
        changeHistory.set('/file1.js', { lastChange: Date.now() });
        activityManager.decayActivity(activityMap, changeHistory, 0.5);
        expect(activityMap.get('/file1.js')).toBe(10);
    });
  });

  describe('recordFileChange', () => {
    it('should record file change and increase activity', () => {
      const filePath = '/file.js';
      const calculateBoost = (fp) => (fp === filePath ? 2.0 : 1.0);

      activityManager.recordFileChange(filePath, activityMap, changeHistory, 3, loggerSpy, calculateBoost);
      expect(activityMap.get(filePath)).toBeCloseTo(2.0);
      expect(changeHistory.get(filePath).changes.length).toBe(1);
      expect(changeHistory.get(filePath).lastChange).toBe(Date.now());
      expect(changeHistory.get(filePath).totalChanges).toBe(1);
      expect(loggerSpy.debug).toHaveBeenCalledWith(`Зарегистрировано изменение: ${filePath} (активность: 2.00)`);
    });

    it('should cap activity at 10.0', () => {
      const filePath = '/file.js';
      activityMap.set(filePath, 9.0);
      const calculateBoost = (fp) => (fp === filePath ? 2.0 : 1.0);

      activityManager.recordFileChange(filePath, activityMap, changeHistory, 3, loggerSpy, calculateBoost);
      expect(activityMap.get(filePath)).toBeCloseTo(10.0);
    });

    it('should limit change history size', () => {
      const filePath = '/file.js';
      const calculateBoost = (fp) => (fp === filePath ? 1.0 : 0);

      for (let i = 0; i < 5; i++) {
        activityManager.recordFileChange(filePath, activityMap, changeHistory, 3, loggerSpy, calculateBoost);
        jest.advanceTimersByTime(1);
      }
      expect(changeHistory.get(filePath).changes.length).toBe(3);
      expect(changeHistory.get(filePath).totalChanges).toBe(5);
    });
  });

  describe('calculateTestPriority', () => {
    it('should calculate priority based on activity and history', () => {
      const testFile = '/test.test.js';
      const dep1 = '/dep1.js';
      const dep2 = '/dep2.js';

      dependencies.set(testFile, [dep1, dep2]);
      activityMap.set(testFile, 2.0);
      activityMap.set(dep1, 3.0);
      activityMap.set(dep2, 1.0);

      testHistory.set(testFile, {
        lastFailed: Date.now() - 100000, // Failed 100s ago (within 5min)
        lastSuccess: Date.now() - 600000, // Succeeded 10min ago (outside 1min)
      });

      const priority = activityManager.calculateTestPriority(testFile, dependencies, testHistory, activityMap, config);
      // Base priority (1.0)
      // Dep activities: (3.0 * 2.0) + (1.0 * 2.0) = 6.0 + 2.0 = 8.0
      // Test activity: 2.0
      // Last failed: +2.0
      // Total: 1.0 + 8.0 + 2.0 + 2.0 = 13.0
      expect(priority).toBe(13.0);
    });

    it('should reduce priority for recently succeeded tests', () => {
      const testFile = '/test.test.js';
      testHistory.set(testFile, {
        lastFailed: 0,
        lastSuccess: Date.now() - 30000, // Succeeded 30s ago (within 1min)
      });

      const priority = activityManager.calculateTestPriority(testFile, dependencies, testHistory, activityMap, config);
      // Base (1.0) - lastSuccess (1.0) = 0.0
      expect(priority).toBe(0.0);
    });

    it('should return 0 if calculated priority is negative', () => {
      const testFile = '/test.test.js';
      testHistory.set(testFile, {
        lastFailed: 0,
        lastSuccess: Date.now() - 10000, // Very recent success
      });
      // This would result in 1 - 1 = 0. If it was lower, it should be capped at 0.
      const priority = activityManager.calculateTestPriority(testFile, dependencies, testHistory, activityMap, config);
      expect(priority).toBe(0);
    });
  });

  describe('calculateActivityBoost', () => {
    it('should return correct boost for config/package.json files', () => {
      expect(activityManager.calculateActivityBoost('/path/to/config.js')).toBe(3.0);
      expect(activityManager.calculateActivityBoost('/path/to/package.json')).toBe(3.0);
    });

    it('should return correct boost for index/main js/ts files', () => {
      expect(activityManager.calculateActivityBoost('/path/to/index.js')).toBe(2.5);
      expect(activityManager.calculateActivityBoost('/path/to/main.ts')).toBe(2.5);
    });

    it('should return correct boost for other js/ts files', () => {
      expect(activityManager.calculateActivityBoost('/path/to/util.js')).toBe(2.0);
      expect(activityManager.calculateActivityBoost('/path/to/component.ts')).toBe(2.0);
    });

    it('should return correct boost for json/yaml/yml files', () => {
      expect(activityManager.calculateActivityBoost('/path/to/data.json')).toBe(1.5);
      expect(activityManager.calculateActivityBoost('/path/to/settings.yaml')).toBe(1.5);
    });

    it('should return correct boost for md/txt files', () => {
      expect(activityManager.calculateActivityBoost('/path/to/README.md')).toBe(0.5);
      expect(activityManager.calculateActivityBoost('/path/to/notes.txt')).toBe(0.5);
    });

    it('should return default boost for unknown file types', () => {
      expect(activityManager.calculateActivityBoost('/path/to/image.png')).toBe(1.0);
      expect(activityManager.calculateActivityBoost('/path/to/archive.zip')).toBe(1.0);
    });
  });

  describe('getActivityLevel', () => {
    it('should return activity level for a given path', () => {
      activityMap.set('/file1.js', 5.5);
      expect(activityManager.getActivityLevel('/file1.js', activityMap)).toBe(5.5);
    });

    it('should return 0 if path is not in activity map', () => {
      expect(activityManager.getActivityLevel('/nonexistent.js', activityMap)).toBe(0);
    });
  });

  describe('increaseActivity', () => {
    it('should increase activity for a given path', () => {
      const filePath = '/file.js';
      activityMap.set(filePath, 2.0);
      activityManager.increaseActivity(filePath, activityMap, changeHistory, 3, loggerSpy, 3);
      expect(activityMap.get(filePath)).toBe(5.0);
      expect(changeHistory.get(filePath).length).toBe(1);
      expect(loggerSpy.debug).toHaveBeenCalledWith(`Активность увеличена для ${filePath}: 2 -> 5`);
    });

    it('should add new entry if path not present', () => {
      const filePath = '/new-file.js';
      activityManager.increaseActivity(filePath, activityMap, changeHistory, 3, loggerSpy, 2);
      expect(activityMap.get(filePath)).toBe(2.0);
      expect(changeHistory.get(filePath).length).toBe(1);
    });

    it('should limit change history size', () => {
        const filePath = '/file.js';
        activityManager.increaseActivity(filePath, activityMap, changeHistory, 1, loggerSpy, 1);
        activityManager.increaseActivity(filePath, activityMap, changeHistory, 1, loggerSpy, 1);
        expect(changeHistory.get(filePath).length).toBe(1);
    });
  });

  describe('addToChangeHistory', () => {
    it('should add record to change history and limit size', () => {
      const filePath = '/file.js';
      const record1 = { timestamp: 1, activity: 1, change: 1 };
      const record2 = { timestamp: 2, activity: 2, change: 1 };
      const record3 = { timestamp: 3, activity: 3, change: 1 };
      const record4 = { timestamp: 4, activity: 4, change: 1 };

      activityManager.addToChangeHistory(filePath, record1, changeHistory, 3);
      activityManager.addToChangeHistory(filePath, record2, changeHistory, 3);
      activityManager.addToChangeHistory(filePath, record3, changeHistory, 3);
      expect(changeHistory.get(filePath)).toEqual([record1, record2, record3]);

      activityManager.addToChangeHistory(filePath, record4, changeHistory, 3);
      expect(changeHistory.get(filePath)).toEqual([record2, record3, record4]);
    });
  });

  describe('getActivityStats', () => {
    it('should return correct activity statistics', () => {
      activityMap.set('/file1.js', 5);
      activityMap.set('/file2.js', 10);
      activityMap.set('/file3.js', 2);

      changeHistory.set('/file1.js', { changes: [{activity: 1}, {activity: 2}], lastChange: Date.now() - 10000, totalChanges: 2 });
      changeHistory.set('/file2.js', { changes: [{activity: 5}], lastChange: Date.now() - 60000, totalChanges: 1 });
      changeHistory.set('/file3.js', { changes: [{activity: 0.5}], lastChange: Date.now() - 600000, totalChanges: 1 }); // Older than 5 min

      const stats = activityManager.getActivityStats(activityMap, changeHistory);

      expect(stats.totalActivePaths).toBe(3);
      expect(stats.totalChanges).toBe(4);
      expect(stats.averageActivity).toBeCloseTo((5 + 10 + 2) / 3);
      expect(stats.mostActivePaths[0].path).toBe('/file2.js');
      expect(stats.recentChanges.length).toBe(2); // file1 and file2 are recent
      expect(stats.recentChanges[0].path).toBe('/file1.js');
    });

    it('should return empty stats if no activity', () => {
      const stats = activityManager.getActivityStats(new Map(), new Map());
      expect(stats.totalActivePaths).toBe(0);
      expect(stats.totalChanges).toBe(0);
      expect(stats.averageActivity).toBe(0);
      expect(stats.mostActivePaths).toEqual([]);
      expect(stats.recentChanges).toEqual([]);
    });
  });

  describe('cleanupOldActivity', () => {
    it('should remove old and low activity entries', () => {
      activityMap.set('/active.js', 5);
      activityMap.set('/old_low.js', 0.2);
      activityMap.set('/old_high.js', 1.0);
      activityMap.set('/recent_low.js', 0.2);

      changeHistory.set('/active.js', { lastChange: Date.now() });
      changeHistory.set('/old_low.js', { lastChange: Date.now() - 3600001 }); // Older than 1 hour
      changeHistory.set('/old_high.js', { lastChange: Date.now() - 3600001 }); // Older than 1 hour, but high activity
      changeHistory.set('/recent_low.js', { lastChange: Date.now() - 10000 }); // Recent, but low activity

      activityManager.cleanupOldActivity(activityMap, changeHistory);

      expect(activityMap.has('/active.js')).toBe(true);
      expect(activityMap.has('/old_low.js')).toBe(false);
      expect(activityMap.has('/old_high.js')).toBe(true);
      expect(activityMap.has('/recent_low.js')).toBe(true);

      expect(changeHistory.has('/active.js')).toBe(true);
      expect(changeHistory.has('/old_low.js')).toBe(false);
      expect(changeHistory.has('/old_high.js')).toBe(true);
      expect(changeHistory.has('/recent_low.js')).toBe(true);
    });
  });
});
