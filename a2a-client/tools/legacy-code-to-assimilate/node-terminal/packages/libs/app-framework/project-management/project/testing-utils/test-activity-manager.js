const path = require('path');

class TestActivityManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.activityDecayRate = options.activityDecayRate || 0.95;
    this.maxActivityHistory = options.maxActivityHistory || 100;
    this.activityBoostMultiplier = options.activityBoostMultiplier || 2.0;
  }

  startActivityDecay(decayActivityCallback) {
    return setInterval(decayActivityCallback, 30000); // Затухание каждые 30 секунд
  }

  decayActivity(activityMap, changeHistory, activityDecayRate) {
    const now = Date.now();
    for (const [path, activity] of activityMap.entries()) {
      const timeSinceLastChange = now - (changeHistory.get(path)?.lastChange || now);
      const decayFactor = Math.pow(activityDecayRate, timeSinceLastChange / 60000); // 1 минута
      const newActivity = activity * decayFactor;

      if (newActivity < 0.1) {
        activityMap.delete(path);
        changeHistory.delete(path);
      } else {
        activityMap.set(path, newActivity);
      }
    }
  }

  recordFileChange(filePath, activityMap, changeHistory, maxActivityHistory, logger, calculateActivityBoost) {
    const now = Date.now();
    const currentActivity = activityMap.get(filePath) || 0;
    const activityBoost = calculateActivityBoost(filePath);
    const newActivity = Math.min(currentActivity + activityBoost, 10.0);

    activityMap.set(filePath, newActivity);

    const history = changeHistory.get(filePath) || {
      changes: [],
      lastChange: 0,
      totalChanges: 0
    };

    history.changes.push({
      timestamp: now,
      activity: newActivity,
      boost: activityBoost
    });

    if (history.changes.length > maxActivityHistory) {
      history.changes = history.changes.slice(-maxActivityHistory);
    }

    history.lastChange = now;
    history.totalChanges++;

    changeHistory.set(filePath, history);
    logger.debug(`Зарегистрировано изменение: ${filePath} (активность: ${newActivity.toFixed(2)})`);
  }

  calculateTestPriority(testFile, dependencies, testHistory, activityMap, config) {
    let totalPriority = 0;
    totalPriority += 1.0;

    const deps = dependencies.get(testFile) || [];
    for (const dep of deps) {
      const activity = activityMap.get(dep) || 0;
      totalPriority += activity * config.activityBoostMultiplier;
    }

    const testActivity = activityMap.get(testFile) || 0;
    totalPriority += testActivity;

    const history = testHistory.get(testFile);
    if (history) {
      if (history.lastFailed && (Date.now() - history.lastFailed) < 300000) {
        totalPriority += 2.0;
      }
      if (history.lastSuccess && (Date.now() - history.lastSuccess) < 60000) {
        totalPriority -= 1.0;
      }
    }
    return Math.max(0, totalPriority);
  }

  calculateActivityBoost(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();

    if (fileName.includes('config') || fileName.includes('package.json')) {
      return 3.0;
    }
    if (ext === '.js' || ext === '.ts') {
      if (fileName.includes('index') || fileName.includes('main')) {
        return 2.5;
      }
      return 2.0;
    }
    if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
      return 1.5;
    }
    if (ext === '.md' || ext === '.txt') {
      return 0.5;
    }
    return 1.0;
  }

  getActivityLevel(path, activityMap) {
    return activityMap.get(path) || 0;
  }

  increaseActivity(filePath, activityMap, changeHistory, maxActivityHistory, logger, amount = 1) {
    const currentActivity = activityMap.get(filePath) || 0;
    const newActivity = currentActivity + amount;
    activityMap.set(filePath, newActivity);

    this.addToChangeHistory(filePath, {
      timestamp: Date.now(),
      activity: newActivity,
      change: amount
    }, changeHistory, maxActivityHistory);

    logger.debug(`Активность увеличена для ${filePath}: ${currentActivity} -> ${newActivity}`);
  }

  addToChangeHistory(filePath, record, changeHistory, maxActivityHistory) {
    if (!changeHistory.has(filePath)) {
      changeHistory.set(filePath, []);
    }
    const history = changeHistory.get(filePath);
    history.push(record);
    if (history.length > maxActivityHistory) {
      history.shift();
    }
  }

  getActivityStats(activityMap, changeHistory) {
    const stats = {
      totalActivePaths: activityMap.size,
      totalChanges: 0,
      averageActivity: 0,
      mostActivePaths: [],
      recentChanges: []
    };
    let totalActivity = 0;
    const activities = [];

    for (const [path, activity] of activityMap.entries()) {
      totalActivity += activity;
      activities.push({ path, activity });
      const history = changeHistory.get(path);
      if (history) {
        stats.totalChanges += history.totalChanges;
      }
    }

    if (activityMap.size > 0) {
      stats.averageActivity = totalActivity / activityMap.size;
    }

    activities.sort((a, b) => b.activity - a.activity);
    stats.mostActivePaths = activities.slice(0, 10);

    const recentChanges = [];
    for (const [path, history] of changeHistory.entries()) {
      if (history.lastChange > Date.now() - 300000) {
        recentChanges.push({
          path,
          lastChange: history.lastChange,
          activity: activityMap.get(path) || 0
        });
      }
    }

    recentChanges.sort((a, b) => b.lastChange - a.lastChange);
    stats.recentChanges = recentChanges.slice(0, 10);

    return stats;
  }

  cleanupOldActivity(activityMap, changeHistory) {
    const cutoffTime = Date.now() - 3600000; // 1 час
    for (const [path, history] of changeHistory.entries()) {
      if (history.lastChange < cutoffTime && (activityMap.get(path) || 0) < 0.5) {
        activityMap.delete(path);
        changeHistory.delete(path);
      }
    }
  }
}

export { TestActivityManager };
