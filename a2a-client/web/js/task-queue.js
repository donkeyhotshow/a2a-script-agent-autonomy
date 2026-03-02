/**
 * Task Queue Manager - Manages task queue and tracking
 * Provides UI for viewing and managing queued tasks
 */

class TaskQueueManager {
    constructor() {
        this.tasks = new Map();
        this.listeners = new Map();
        this.maxTasks = 100;
    }

    /**
     * Initialize Task Queue Manager
     */
    init() {
        this._setupEventListeners();
        console.log('[TaskQueue] Initialized');
    }

    /**
     * Setup event listeners for UI elements
     */
    _setupEventListeners() {
        // Close button
        document.getElementById('closeTaskQueuePanel')?.addEventListener('click', () => {
            this.hide();
        });

        // Clear completed button
        document.getElementById('clearCompletedTasks')?.addEventListener('click', () => {
            this.clearCompleted();
        });
    }

    /**
     * Add a new task to the queue
     */
    addTask(taskData) {
        const taskId = taskData.id || 'task-' + Date.now();

        const task = {
            id: taskId,
            name: taskData.name || taskData.task || 'Untitled Task',
            status: 'pending', // pending, running, completed, failed, cancelled
            progress: 0,
            createdAt: Date.now(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null,
            nodeId: taskData.nodeId || null
        };

        this.tasks.set(taskId, task);
        this._render();
        this._emit('taskAdded', task);

        return taskId;
    }

    /**
     * Update task status
     */
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        // Update fields
        Object.assign(task, updates);

        // Update timestamps
        if (updates.status === 'running' && !task.startedAt) {
            task.startedAt = Date.now();
        }

        if ((updates.status === 'completed' || updates.status === 'failed') && !task.completedAt) {
            task.completedAt = Date.now();
        }

        this._render();
        this._emit('taskUpdated', task);
    }

    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }

    /**
     * Get all tasks
     */
    getAllTasks() {
        return Array.from(this.tasks.values());
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status) {
        return this.getAllTasks().filter(t => t.status === status);
    }

    /**
     * Get task statistics
     */
    getStats() {
        const tasks = this.getAllTasks();
        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            cancelled: tasks.filter(t => t.status === 'cancelled').length
        };
    }

    /**
     * Cancel a task
     */
    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        if (task.status === 'pending' || task.status === 'running') {
            task.status = 'cancelled';
            task.completedAt = Date.now();
            this._render();
            this._emit('taskCancelled', task);
            return true;
        }

        return false;
    }

    /**
     * Clear completed tasks
     */
    clearCompleted() {
        const completedStatuses = ['completed', 'failed', 'cancelled'];

        for (const [taskId, task] of this.tasks) {
            if (completedStatuses.includes(task.status)) {
                this.tasks.delete(taskId);
            }
        }

        this._render();
        this._emit('completedCleared');
    }

    /**
     * Clear all tasks
     */
    clearAll() {
        this.tasks.clear();
        this._render();
        this._emit('allCleared');
    }

    /**
     * Show task queue panel
     */
    show() {
        const panel = document.getElementById('taskQueuePanel');
        if (panel) {
            panel.style.display = 'flex';
            this._render();
        }
    }

    /**
     * Hide task queue panel
     */
    hide() {
        const panel = document.getElementById('taskQueuePanel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * Toggle task queue panel
     */
    toggle() {
        const panel = document.getElementById('taskQueuePanel');
        if (panel?.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Render task queue UI
     */
    _render() {
        const listContainer = document.getElementById('taskQueueList');
        const statsContainer = document.getElementById('taskQueueStats');

        if (!listContainer) return;

        const tasks = this.getAllTasks().sort((a, b) => b.createdAt - a.createdAt);
        const stats = this.getStats();

        // Update stats
        if (statsContainer) {
            statsContainer.innerHTML = `
        <span class="stat-pending">${stats.pending} pending</span>
        <span class="stat-running">${stats.running} running</span>
        <span class="stat-completed">${stats.completed} completed</span>
      `;
        }

        // Update list
        if (tasks.length === 0) {
            listContainer.innerHTML = '<div class="task-queue-empty">No tasks in queue</div>';
            return;
        }

        listContainer.innerHTML = tasks.map(task => this._renderTaskItem(task)).join('');

        // Add click handlers
        listContainer.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.taskId;
                this._onTaskClick(taskId);
            });

            // Cancel button
            item.querySelector('.task-cancel-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = item.dataset.taskId;
                this.cancelTask(taskId);
            });

            // Retry button
            item.querySelector('.task-retry-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = item.dataset.taskId;
                this._retryTask(taskId);
            });
        });
    }

    /**
     * Render a single task item
     */
    _renderTaskItem(task) {
        const statusIcon = this._getStatusIcon(task.status);
        const statusClass = `task-status-${task.status}`;
        const duration = this._getDuration(task);

        return `
      <div class="task-item ${statusClass}" data-task-id="${task.id}">
        <div class="task-item-header">
          <span class="task-status-icon">${statusIcon}</span>
          <span class="task-name">${this._escapeHtml(task.name)}</span>
        </div>
        <div class="task-item-meta">
          <span class="task-duration">${duration}</span>
          ${task.status === 'running' ? `<span class="task-progress">${task.progress}%</span>` : ''}
        </div>
        <div class="task-item-actions">
          ${task.status === 'pending' || task.status === 'running' ?
            `<button class="task-cancel-btn" title="Cancel">✕</button>` : ''}
          ${task.status === 'failed' ?
            `<button class="task-retry-btn" title="Retry">↻</button>` : ''}
        </div>
        ${task.error ? `<div class="task-error">${this._escapeHtml(task.error)}</div>` : ''}
      </div>
    `;
    }

    /**
     * Get status icon
     */
    _getStatusIcon(status) {
        const icons = {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌',
            cancelled: '🚫'
        };
        return icons[status] || '❓';
    }

    /**
     * Get task duration
     */
    _getDuration(task) {
        const endTime = task.completedAt || Date.now();
        const startTime = task.startedAt || task.createdAt;
        const duration = Math.floor((endTime - startTime) / 1000);

        if (duration < 60) return `${duration}s`;
        if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
        return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
    }

    /**
     * Handle task click
     */
    _onTaskClick(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        // Focus on node if linked
        if (task.nodeId && window.flowManager) {
            window.flowManager.focusNode(task.nodeId);
        }

        this._emit('taskClicked', task);
    }

    /**
     * Retry failed task
     */
    _retryTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'failed') return;

        // Reset task
        task.status = 'pending';
        task.progress = 0;
        task.error = null;
        task.startedAt = null;
        task.completedAt = null;

        this._render();
        this._emit('taskRetried', task);
    }

    /**
     * Escape HTML
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Subscribe to events
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        return () => this.listeners.get(event)?.delete(callback);
    }

    /**
     * Emit event
     */
    _emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// Create singleton instance
const taskQueueManager = new TaskQueueManager();

// Make available globally
if (typeof window !== 'undefined') {
    window.TaskQueueManager = TaskQueueManager;
    window.taskQueueManager = taskQueueManager;
}
