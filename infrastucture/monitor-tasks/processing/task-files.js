import fs from 'fs';
import path from 'path';

/**
 * @param {new () => unknown} Ctor
 */
export function applyTaskMonitorTaskFiles(Ctor) {
  Object.assign(Ctor.prototype, {
    async readTaskDescriptionForName(taskName) {
      const taskFilePath = path.join(this.tasksDir, taskName);
      try {
        const content = fs.readFileSync(taskFilePath, 'utf8');
        return this.extractTaskDescription(content);
      } catch {
        return null;
      }
    },

    async getTaskFiles() {
      try {
        const skipNames = new Set(['README.md', 'ONE-PIPELINE.md', 'STACK-RUN.md']);
        if (this.taskListPath && fs.existsSync(this.taskListPath)) {
          const lines = fs.readFileSync(this.taskListPath, 'utf8').split(/\r?\n/);
          const names = lines.map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
          const out = [];
          for (const raw of names) {
            const file = raw.endsWith('.md') ? raw : `${raw}.md`;
            if (skipNames.has(file)) continue;
            const full = path.join(this.tasksDir, path.basename(file));
            if (!fs.existsSync(full)) {
              this.log('warn', `[task-monitor] TASK_MONITOR_TASK_LIST: missing ${file}, skipping`);
              continue;
            }
            out.push({
              name: path.basename(full),
              path: full,
              content: fs.readFileSync(full, 'utf8'),
            });
          }
          return out;
        }
        const files = fs
          .readdirSync(this.tasksDir)
          .filter((file) => file.endsWith('.md') && !skipNames.has(file))
          .sort((a, b) => a.localeCompare(b, 'en'));
        return files.map((file) => ({
          name: file,
          path: path.join(this.tasksDir, file),
          content: fs.readFileSync(path.join(this.tasksDir, file), 'utf8'),
        }));
      } catch (error) {
        this.logError('getTaskFiles', error);
        return [];
      }
    },
  });
}
