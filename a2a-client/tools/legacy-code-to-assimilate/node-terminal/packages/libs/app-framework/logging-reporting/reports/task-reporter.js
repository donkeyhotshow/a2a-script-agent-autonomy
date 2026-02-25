const { FileSystemUtils } = require('@libs/system/file-operations');
const path = require('path');

class TaskReporter {
  constructor(config = {}) {
    this.fileSystem = new FileSystemUtils(config.logger || console);
    this.taskDirectory = config.taskDirectory || 'C:\\apps\\system-run\\work';
    this.ensureTaskDirectory();
  }

  async ensureTaskDirectory() {
    try {
      await this.fileSystem.ensureDirectory(this.taskDirectory);
    } catch (error) {
      console.error(`Ошибка при создании директории для задач ${this.taskDirectory}:`, error.message);
      throw error; 
    }
  }

  async saveErrorReport(errorReport) {
    await this.ensureTaskDirectory();

    const filename = `error-report.json`;
    const filePath = this.fileSystem.join(this.taskDirectory, filename);

    try {
      await this.fileSystem.writeFile(filePath, JSON.stringify(errorReport, null, 2), 'utf8');
      console.log(`✅ Отчет об ошибке сохранен в ${filePath}`);
      return filePath;
    } catch (error) {
      console.error(`❌ Ошибка при сохранении отчета об ошибке в ${filePath}:`, error.message);
      throw error; 
    }
  }
}

export { TaskReporter };
