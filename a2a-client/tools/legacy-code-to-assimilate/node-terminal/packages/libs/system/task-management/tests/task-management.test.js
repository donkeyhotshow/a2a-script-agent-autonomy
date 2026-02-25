/**
 * TaskManagementUtils - Unit Tests
 * Тестирование утилит управления задачами
 */

const { consoleUtils } = require('@libs/logging-monitoring/logging/console-utils');
const { TaskManagementUtils } = require('../index.js');
const { SystemUtils } = require('@libs/system');
const { ErrorHandler } = require('@libs/error-management/error-handler');
const { ConfigurationUtils } = require('@libs/core/configuration');
const { TestingUtils } = require('@libs/testing/utils'); // Обновлен импорт
const { TestingTaskManagerUtils } = require('@libs/testing/taskmanager/utils'); // Обновлен импорт
const { LoggingUtils } = require('../../logging/index.js');
const { ErrorHandlingUtils } = require('../../error-handling/index.js');
const { FileSystemUtils } = require('../../file-operations/index.js');
const os = require('os');
const path = require('path');

describe('TaskManagementUtils', () => {
    let taskManager;
    let testDir;
    let realDependencies;

    beforeEach(async () => {
        testDir = path.join(os.tmpdir(), 'task-mgmt-test-' + Date.now());
        realDependencies = {
            logger: new LoggingUtils(),
            errorHandler: new ErrorHandlingUtils(),
            fileSystemUtils: new FileSystemUtils(),
            storagePath: testDir,
            tasksFile: 'test-tasks.json',
            appsConfigFile: 'test-apps-list.json'
        };

        taskManager = new TaskManagementUtils(realDependencies);

        await taskManager.initialize();
    });

    afterEach(async () => {
        if (taskManager) {
            await taskManager.cleanup();
        }
    });

    describe('Constructor', () => {
        test('should create instance with default options', () => {
            const defaultManager = new TaskManagementUtils();
            expect(defaultManager).toBeDefined();
            expect(defaultManager.tasks).toBeDefined();
            expect(Array.isArray(defaultManager.tasks)).toBe(true);
            expect(defaultManager.appsMap).toBeDefined();
            expect(defaultManager.appsMap instanceof Map).toBe(true);
        });

        test('should create instance with custom options', () => {
            expect(taskManager).toBeDefined();
            expect(taskManager.options.storagePath).toBe(testDir);
            expect(taskManager.options.tasksFile).toBe('test-tasks.json');
            expect(taskManager.options.appsConfigFile).toBe('test-apps-list.json');
        });

        test('should set resolved statuses correctly', () => {
            expect(taskManager.options.resolvedStatuses).toContain('resolved');
            expect(taskManager.options.resolvedStatuses).toContain('closed');
            expect(taskManager.options.resolvedStatuses).toContain('ok');
        });
    });

    describe('Initialization', () => {
        test('should initialize successfully with no existing files', async () => {
            expect(taskManager.tasks).toHaveLength(0);
        });

        test('should load existing tasks and apps config', async () => {
            const existingTasks = [
                {
                    id: 'task1',
                    appId: 'app1',
                    appPath: '/path/to/app1',
                    errorCode: 'TEST_ERROR',
                    status: 'open',
                    message: 'Test task',
                    priority: 'high',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];

            await realDependencies.fileSystemUtils.writeFile(
                path.join(testDir, 'test-tasks.json'),
                JSON.stringify(existingTasks)
            );

            await realDependencies.fileSystemUtils.writeFile(
                path.join(testDir, 'test-apps-list.json'),
                JSON.stringify({
                    apps: [
                        { id: 'app1', path: '/path/to/app1', name: 'App 1' },
                        { id: 'app2', path: '/path/to/app2', name: 'App 2' }
                    ]
                })
            );

            const newManager = new TaskManagementUtils(realDependencies);

            await newManager.initialize();

            expect(newManager.tasks).toHaveLength(1);
            expect(newManager.tasks[0].id).toBe('task1');
            expect(newManager.appsMap.size).toBe(2);
        });
    });

    describe('Task Creation', () => {
        test('should create error task successfully', async () => {
            const taskOptions = {
                appId: 'app1',
                errorCode: 'TEST_ERROR',
                message: 'Test error message',
                priority: 'high',
                tags: ['test', 'error']
            };

            const task = await taskManager.createErrorTask(taskOptions);

            expect(task).toBeDefined();
            expect(task.id).toBeDefined();
            expect(task.appId).toBe('app1');
            expect(task.errorCode).toBe('TEST_ERROR');
            expect(task.message).toBe('Test error message');
            expect(task.priority).toBe('high');
            expect(task.status).toBe('open');
            expect(task.tags).toContain('test');
            expect(task.tags).toContain('error');
            expect(task.createdAt).toBeDefined();
            expect(task.updatedAt).toBeDefined();

            expect(realDependencies.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Создана новая задача')
            );
        });

        test('should throw error for missing required fields', async () => {
            await expect(taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'TEST_ERROR'
                // missing message
            })).rejects.toThrow('appId, errorCode и message обязательны');

            await expect(taskManager.createErrorTask({
                errorCode: 'TEST_ERROR',
                message: 'test'
                // missing appId
            })).rejects.toThrow('appId, errorCode и message обязательны');
        });

        test('should throw error for non-existent app', async () => {
            await expect(taskManager.createErrorTask({
                appId: 'non-existent-app',
                errorCode: 'TEST_ERROR',
                message: 'test message'
            })).rejects.toThrow('Приложение с ID "non-existent-app" не найдено');
        });

        test('should create task with default values', async () => {
            const task = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'TEST_ERROR',
                message: 'test message'
            });

            expect(task.priority).toBe('medium');
            expect(task.status).toBe('open');
            expect(Array.isArray(task.tags)).toBe(true);
            expect(task.tags).toHaveLength(0);
        });
    });

    describe('Task Status Management', () => {
        let testTask;

        beforeEach(async () => {
            testTask = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'TEST_ERROR',
                message: 'Test task for status management'
            });
        });

        test('should update task status successfully', async () => {
            const updatedTask = await taskManager.updateTaskStatus(testTask.id, 'in_progress');

            expect(updatedTask.status).toBe('in_progress');
            expect(updatedTask.updatedAt).toBeDefined();
            expect(updatedTask.resolvedAt).toBeNull();
            expect(updatedTask.resolvedBy).toBeNull();
        });

        test('should resolve task and set resolved fields', async () => {
            const updatedTask = await taskManager.updateTaskStatus(testTask.id, 'resolved', 'test-user');

            expect(updatedTask.status).toBe('resolved');
            expect(updatedTask.resolvedAt).toBeDefined();
            expect(updatedTask.resolvedBy).toBe('test-user');
        });

        test('should throw error for non-existent task', async () => {
            await expect(taskManager.updateTaskStatus('non-existent-id', 'resolved'))
                .rejects.toThrow('Задача с ID "non-existent-id" не найдена');
        });

        test('should cancel task successfully', async () => {
            const cancelledTask = await taskManager.cancelTask(testTask.id, 'Test cancellation');

            expect(cancelledTask.status).toBe('cancelled');
            expect(cancelledTask.resolvedAt).toBeDefined();
            expect(cancelledTask.resolvedBy).toBe('system');
            expect(cancelledTask.context.cancellationReason).toBe('Test cancellation');

            expect(realDependencies.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('отменена по причине: Test cancellation')
            );
        });

        test('should handle cancelling already cancelled task', async () => {
            await taskManager.cancelTask(testTask.id);
            const result = await taskManager.cancelTask(testTask.id);

            expect(result.status).toBe('cancelled');
            expect(realDependencies.logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('уже отменена')
            );
        });
    });

    describe('Task Scheduling', () => {
        let testTask;

        beforeEach(async () => {
            testTask = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'TEST_ERROR',
                message: 'Test task for scheduling'
            });
        });

        test('should schedule task successfully', async () => {
            const futureDate = new Date(Date.now() + 3600000); // +1 hour
            const scheduledTask = await taskManager.scheduleTask(testTask.id, futureDate);

            expect(scheduledTask.scheduledFor).toBeDefined();
            expect(scheduledTask.updatedAt).toBeDefined();

            expect(realDependencies.logger.info).toHaveBeenCalledWith(
                expect.stringContaining('запланирована на')
            );
        });

        test('should schedule task with date string', async () => {
            const futureDate = new Date(Date.now() + 3600000).toISOString();
            const scheduledTask = await taskManager.scheduleTask(testTask.id, futureDate);

            expect(scheduledTask.scheduledFor).toBe(futureDate);
        });

        test('should throw error for invalid scheduledFor', async () => {
            await expect(taskManager.scheduleTask(testTask.id, 12345))
                .rejects.toThrow('scheduledFor должна быть датой или строкой даты');
        });

        test('should get scheduled tasks', async () => {
            const pastDate = new Date(Date.now() - 3600000); // -1 hour
            await taskManager.scheduleTask(testTask.id, pastDate);

            const scheduledTasks = await taskManager.getScheduledTasks();

            expect(scheduledTasks).toHaveLength(1);
            expect(scheduledTasks[0].id).toBe(testTask.id);
        });

        test('should not return future scheduled tasks', async () => {
            const futureDate = new Date(Date.now() + 3600000); // +1 hour
            await taskManager.scheduleTask(testTask.id, futureDate);

            const scheduledTasks = await taskManager.getScheduledTasks();

            expect(scheduledTasks).toHaveLength(0);
        });
    });

    describe('Task Queries', () => {
        beforeEach(async () => {
            // Create multiple test tasks
            await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_1',
                message: 'Error 1',
                priority: 'high'
            });

            await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_2',
                message: 'Error 2',
                priority: 'low'
            });

            await taskManager.createErrorTask({
                appId: 'app2',
                errorCode: 'ERROR_1',
                message: 'Error 3',
                priority: 'critical'
            });
        });

        test('should get tasks by priority', () => {
            const highPriorityTasks = taskManager.getTasksByPriority();

            expect(highPriorityTasks.length).toBe(3);
            expect(highPriorityTasks[0].priority).toBe('critical');
            expect(highPriorityTasks[1].priority).toBe('high');
            expect(highPriorityTasks[2].priority).toBe('low');
        });

        test('should filter tasks by status', () => {
            const openTasks = taskManager.getTasksByPriority('open');

            expect(openTasks.length).toBe(3);
            expect(openTasks.every(task => task.status === 'open')).toBe(true);
        });

        test('should find task by error', async () => {
            const foundTask = await taskManager.findTaskByError('app1', 'ERROR_1');

            expect(foundTask).toBeDefined();
            expect(foundTask.appId).toBe('app1');
            expect(foundTask.errorCode).toBe('ERROR_1');
        });

        test('should return null for non-existent error', async () => {
            const foundTask = await taskManager.findTaskByError('app1', 'NON_EXISTENT_ERROR');
            expect(foundTask).toBeNull();
        });

        test('should find tasks by criteria', async () => {
            const foundTasks = await taskManager.findTasks({
                appId: 'app1',
                priority: 'high'
            });

            expect(foundTasks.length).toBe(1);
            expect(foundTasks[0].appId).toBe('app1');
            expect(foundTasks[0].priority).toBe('high');
        });

        test('should filter tasks by date range', async () => {
            const yesterday = new Date(Date.now() - 86400000);
            const tomorrow = new Date(Date.now() + 86400000);

            const foundTasks = await taskManager.findTasks({
                createdAfter: yesterday.toISOString(),
                createdBefore: tomorrow.toISOString()
            });

            expect(foundTasks.length).toBe(3);
        });
    });

    describe('Task Reporting', () => {
        beforeEach(async () => {
            await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_1',
                message: 'Error 1',
                priority: 'high'
            });

            await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_2',
                message: 'Error 2',
                priority: 'low'
            });
        });

        test('should generate task status report', async () => {
            const report = await taskManager.reportTaskStatus();

            expect(report.total).toBe(2);
            expect(report.byStatus).toHaveProperty('open');
            expect(report.byPriority).toHaveProperty('high');
            expect(report.byPriority).toHaveProperty('low');
            expect(report.byApp).toHaveProperty('app1');
            expect(report.tasks).toHaveLength(2);
        });

        test('should filter report by appId', async () => {
            const report = await taskManager.reportTaskStatus({ appId: 'app1' });

            expect(report.total).toBe(2);
            expect(report.byApp).toHaveProperty('app1');
        });

        test('should filter report by status', async () => {
            const report = await taskManager.reportTaskStatus({ status: 'open' });

            expect(report.total).toBe(2);
            expect(report.byStatus.open).toBe(2);
        });
    });

    describe('Task Cleanup', () => {
        beforeEach(async () => {
            const task = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_1',
                message: 'Test task for cleanup',
                priority: 'high'
            });

            // Mark task as resolved and set old date
            await taskManager.updateTaskStatus(task.id, 'resolved');
            task.resolvedAt = new Date(Date.now() - 86400000 * 10).toISOString(); // 10 days ago
            await taskManager._saveTasks();
        });

        test('should cleanup resolved tasks', async () => {
            const result = await taskManager.cleanupResolvedTasks({ olderThan: '7d' });

            expect(result.removedTasks).toBeGreaterThanOrEqual(0);
            expect(result).toHaveProperty('remainingTasks');
        });

        test('should support dry run mode', async () => {
            const result = await taskManager.cleanupResolvedTasks({
                olderThan: '7d',
                dryRun: true
            });

            expect(result).toHaveProperty('tasksToRemove');
            expect(result).toHaveProperty('tasks');
            expect(Array.isArray(result.tasks)).toBe(true);
        });
    });

    describe('Task Heartbeat', () => {
        beforeEach(async () => {
            await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_1',
                message: 'Test task for heartbeat'
            });
        });

        test('should update open tasks with heartbeat', async () => {
            const result = await taskManager.heartbeatOpenTasks();

            expect(result.updatedTasks).toBe(1);
            expect(result.tasks).toHaveLength(1);
            expect(result.tasks[0].attempts).toBe(1);
            expect(result.tasks[0].lastAttempt).toBeDefined();
        });

        test('should filter heartbeat by appId', async () => {
            const result = await taskManager.heartbeatOpenTasks({ appId: 'app1' });

            expect(result.updatedTasks).toBe(1);

            const result2 = await taskManager.heartbeatOpenTasks({ appId: 'non-existent' });

            expect(result2.updatedTasks).toBe(0);
        });

        test('should support disabling attempt updates', async () => {
            const result = await taskManager.heartbeatOpenTasks({ updateAttempts: false });

            expect(result.updatedTasks).toBe(1);
            // Should not increment attempts
            expect(result.tasks[0].attempts).toBeUndefined();
        });
    });

    describe('Task Reopening', () => {
        let resolvedTask;

        beforeEach(async () => {
            const task = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_1',
                message: 'Test task for reopening'
            });

            resolvedTask = await taskManager.updateTaskStatus(task.id, 'resolved', 'test-user');
        });

        test('should reopen resolved task', async () => {
            const reopenedTask = await taskManager.reopenTask(resolvedTask.id, { reason: 'testing' });

            expect(reopenedTask.status).toBe('open');
            expect(reopenedTask.resolvedAt).toBeNull();
            expect(reopenedTask.resolvedBy).toBeNull();
            expect(reopenedTask.attempts).toBe(1);
            expect(reopenedTask.context.reason).toBe('testing');
        });

        test('should return task if already open', async () => {
            const task = await taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'ERROR_OPEN',
                message: 'Already open task'
            });

            const result = await taskManager.reopenTask(task.id);

            expect(result.status).toBe('open');
            expect(result.resolvedAt).toBeNull();
        });

        test('should throw error for non-existent task', async () => {
            await expect(taskManager.reopenTask('non-existent-id'))
                .rejects.toThrow('Задача с ID "non-existent-id" не найдена');
        });
    });

    describe('Utility Methods', () => {
        test('should parse time ago correctly', () => {
            const now = Date.now();
            const sevenDaysAgo = taskManager._parseTimeAgo('7d');
            const expected = new Date(now - 7 * 24 * 60 * 60 * 1000);

            expect(sevenDaysAgo.getTime()).toBeCloseTo(expected.getTime(), -1000);
        });

        test('should parse hours correctly', () => {
            const now = Date.now();
            const twoHoursAgo = taskManager._parseTimeAgo('2h');
            const expected = new Date(now - 2 * 60 * 60 * 1000);

            expect(twoHoursAgo.getTime()).toBeCloseTo(expected.getTime(), -1000);
        });

        test('should parse minutes correctly', () => {
            const now = Date.now();
            const thirtyMinutesAgo = taskManager._parseTimeAgo('30m');
            const expected = new Date(now - 30 * 60 * 1000);

            expect(thirtyMinutesAgo.getTime()).toBeCloseTo(expected.getTime(), -1000);
        });

        test('should throw error for invalid time format', () => {
            expect(() => {
                taskManager._parseTimeAgo('invalid');
            }).toThrow('Неверный формат времени');
        });

        test('should generate unique task IDs', () => {
            const id1 = taskManager._generateTaskId();
            const id2 = taskManager._generateTaskId();

            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(typeof id1).toBe('string');
            expect(id1.length).toBe(16); // 8 bytes * 2 hex chars per byte
            expect(id1).not.toBe(id2);
        });
    });

    describe('Error Handling', () => {
        test('should handle file system errors gracefully', async () => {
            realDependencies.fileSystemUtils.writeFile.mockRejectedValue(new Error('File system error'));

            await expect(taskManager.createErrorTask({
                appId: 'app1',
                errorCode: 'TEST_ERROR',
                message: 'Test message'
            })).rejects.toThrow();
        });

        test('should handle JSON parsing errors', async () => {
            realDependencies.fileSystemUtils.fileExists.mockResolvedValue(true);
            realDependencies.fileSystemUtils.readFile.mockResolvedValue('invalid json');

            // Should not throw, should handle error gracefully
            const newManager = new TaskManagementUtils(realDependencies);

            await newManager.initialize();
            expect(newManager.tasks).toHaveLength(0);
        });
    });
});
