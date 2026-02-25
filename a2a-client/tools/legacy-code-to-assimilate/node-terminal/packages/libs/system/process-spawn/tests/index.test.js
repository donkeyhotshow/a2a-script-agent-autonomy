const { 
  ProcessSpawner, 
  ProcessMonitor, 
  ProcessKiller, 
  SpawnConfig, 
  JobManager, 
  SPAWN_TYPES, 
  RESOURCE_LIMITS 
} = require('../index.js');

describe('ProcessSpawn Index Exports', () => {
  test('should export ProcessSpawner', () => {
    expect(ProcessSpawner).toBeDefined();
    expect(typeof ProcessSpawner).toBe('function'); // It's a class
  });

  test('should export ProcessMonitor', () => {
    expect(ProcessMonitor).toBeDefined();
    expect(typeof ProcessMonitor).toBe('function'); // It's a class
  });

  test('should export ProcessKiller', () => {
    expect(ProcessKiller).toBeDefined();
    expect(typeof ProcessKiller).toBe('function'); // It's a class
  });

  test('should export SpawnConfig', () => {
    expect(SpawnConfig).toBeDefined();
    expect(typeof SpawnConfig).toBe('function'); // It's a class
  });

  test('should export JobManager', () => {
    expect(JobManager).toBeDefined();
    expect(typeof JobManager).toBe('function'); // It's a class
  });

  test('should export SPAWN_TYPES', () => {
    expect(SPAWN_TYPES).toBeDefined();
    expect(typeof SPAWN_TYPES).toBe('object');
    expect(SPAWN_TYPES.EXEC).toBe('exec');
    expect(SPAWN_TYPES.SPAWN).toBe('spawn');
  });

  test('should export RESOURCE_LIMITS', () => {
    expect(RESOURCE_LIMITS).toBeDefined();
    expect(typeof RESOURCE_LIMITS).toBe('object');
    expect(RESOURCE_LIMITS.CPU_PERCENT).toBe(100);
    expect(RESOURCE_LIMITS.MEMORY_MB).toBe(1024);
  });

  test('all exported modules should be importable', () => {
    const module = require('../index.js');
    expect(module.ProcessSpawner).toBe(ProcessSpawner);
    expect(module.ProcessMonitor).toBe(ProcessMonitor);
    expect(module.ProcessKiller).toBe(ProcessKiller);
    expect(module.SpawnConfig).toBe(SpawnConfig);
    expect(module.JobManager).toBe(JobManager);
    expect(module.SPAWN_TYPES).toBe(SPAWN_TYPES);
    expect(module.RESOURCE_LIMITS).toBe(RESOURCE_LIMITS);
  });
});
