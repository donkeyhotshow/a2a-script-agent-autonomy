const path = require('path');

class TestStatistics {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  updateTestHistory(testFile, result, testHistory) {
    const history = testHistory.get(testFile) || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRun: 0,
      lastSuccess: 0,
      lastFailed: 0,
      averageDuration: 0
    };

    history.totalRuns++;
    history.lastRun = Date.now();

    if (result.success) {
      history.successfulRuns++;
      history.lastSuccess = Date.now();
    } else {
      history.failedRuns++;
      history.lastFailed = Date.now();
    }

    history.averageDuration = (history.averageDuration * (history.totalRuns - 1) + result.duration) / history.totalRuns;

    testHistory.set(testFile, history);
  }

  updateStats(result, stats) {
    stats.totalTests++;
    stats.totalTime += result.duration;

    if (result.success) {
      stats.passedTests++;
    } else {
      stats.failedTests++;
    }
  }

  getStats(stats, testHistory, activityMap, changeHistory, testActivityManager) {
    const activityStats = testActivityManager.getActivityStats(activityMap, changeHistory);

    return {
      ...stats,
      testHistory: Object.fromEntries(testHistory),
      activity: activityStats
    };
  }
}

export { TestStatistics };
