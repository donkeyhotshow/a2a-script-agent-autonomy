const { TestStatistics } = require('../../test-statistics');
const { TestActivityManager } = require('../../test-activity-manager'); // Import for mocking

describe('TestStatistics', () => {
  let testStatistics;
  let loggerSpy;
  let testHistory;
  let stats;
  let activityMap;
  let changeHistory;
  let mockTestActivityManager;

  beforeEach(() => {
    loggerSpy = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    testHistory = new Map();
    stats = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalTime: 0,
    };
    activityMap = new Map();
    changeHistory = new Map();
    mockTestActivityManager = {
      getActivityStats: jest.fn(() => ({ /* mock activity stats */ }))
    };

    testStatistics = new TestStatistics({
      logger: loggerSpy,
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2023, 0, 1, 12, 0, 0)); // Set a fixed time
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('updateTestHistory', () => {
    it('should update history for a successful test run', () => {
      const testFile = '/test1.test.js';
      const result = { success: true, duration: 100 };

      testStatistics.updateTestHistory(testFile, result, testHistory);

      const history = testHistory.get(testFile);
      expect(history.totalRuns).toBe(1);
      expect(history.successfulRuns).toBe(1);
      expect(history.failedRuns).toBe(0);
      expect(history.lastRun).toBe(Date.now());
      expect(history.lastSuccess).toBe(Date.now());
      expect(history.lastFailed).toBe(0);
      expect(history.averageDuration).toBe(100);
    });

    it('should update history for a failed test run', () => {
      const testFile = '/test2.test.js';
      const result = { success: false, duration: 200 };

      testStatistics.updateTestHistory(testFile, result, testHistory);

      const history = testHistory.get(testFile);
      expect(history.totalRuns).toBe(1);
      expect(history.successfulRuns).toBe(0);
      expect(history.failedRuns).toBe(1);
      expect(history.lastRun).toBe(Date.now());
      expect(history.lastSuccess).toBe(0);
      expect(history.lastFailed).toBe(Date.now());
      expect(history.averageDuration).toBe(200);
    });

    it('should update history for multiple runs and calculate average duration', () => {
      const testFile = '/test3.test.js';

      testStatistics.updateTestHistory(testFile, { success: true, duration: 100 }, testHistory);
      jest.advanceTimersByTime(1000);
      testStatistics.updateTestHistory(testFile, { success: false, duration: 300 }, testHistory);
      jest.advanceTimersByTime(1000);
      testStatistics.updateTestHistory(testFile, { success: true, duration: 200 }, testHistory);

      const history = testHistory.get(testFile);
      expect(history.totalRuns).toBe(3);
      expect(history.successfulRuns).toBe(2);
      expect(history.failedRuns).toBe(1);
      expect(history.lastRun).toBe(Date.now());
      expect(history.lastSuccess).toBe(Date.now());
      expect(history.averageDuration).toBe((100 + 300 + 200) / 3);
    });
  });

  describe('updateStats', () => {
    it('should update overall statistics for a successful test', () => {
      const result = { success: true, duration: 50 };

      testStatistics.updateStats(result, stats);

      expect(stats.totalTests).toBe(1);
      expect(stats.passedTests).toBe(1);
      expect(stats.failedTests).toBe(0);
      expect(stats.totalTime).toBe(50);
    });

    it('should update overall statistics for a failed test', () => {
      const result = { success: false, duration: 150 };

      testStatistics.updateStats(result, stats);

      expect(stats.totalTests).toBe(1);
      expect(stats.passedTests).toBe(0);
      expect(stats.failedTests).toBe(1);
      expect(stats.totalTime).toBe(150);
    });

    it('should accumulate statistics over multiple tests', () => {
      testStatistics.updateStats({ success: true, duration: 10 }, stats);
      testStatistics.updateStats({ success: false, duration: 20 }, stats);
      testStatistics.updateStats({ success: true, duration: 30 }, stats);

      expect(stats.totalTests).toBe(3);
      expect(stats.passedTests).toBe(2);
      expect(stats.failedTests).toBe(1);
      expect(stats.totalTime).toBe(60);
    });
  });

  describe('getStats', () => {
    it('should return combined statistics including activity stats', () => {
      const testFile = '/test.js';
      testStatistics.updateTestHistory(testFile, { success: true, duration: 100 }, testHistory);
      testStatistics.updateStats({ success: true, duration: 100 }, stats);

      mockTestActivityManager.getActivityStats.mockReturnValue({
        totalActivePaths: 5,
        averageActivity: 0.7
      });

      const combinedStats = testStatistics.getStats(stats, testHistory, activityMap, changeHistory, mockTestActivityManager);

      expect(combinedStats.totalTests).toBe(1);
      expect(combinedStats.passedTests).toBe(1);
      expect(combinedStats.totalTime).toBe(100);
      expect(combinedStats.testHistory[testFile]).toBeDefined();
      expect(combinedStats.activity.totalActivePaths).toBe(5);
      expect(combinedStats.activity.averageActivity).toBe(0.7);
      expect(mockTestActivityManager.getActivityStats).toHaveBeenCalledWith(activityMap, changeHistory);
    });

    it('should handle empty test history and activity stats', () => {
      mockTestActivityManager.getActivityStats.mockReturnValue({
        totalActivePaths: 0,
        averageActivity: 0
      });

      const combinedStats = testStatistics.getStats(stats, testHistory, activityMap, changeHistory, mockTestActivityManager);

      expect(combinedStats.totalTests).toBe(0);
      expect(Object.keys(combinedStats.testHistory).length).toBe(0);
      expect(combinedStats.activity.totalActivePaths).toBe(0);
    });
  });
});
