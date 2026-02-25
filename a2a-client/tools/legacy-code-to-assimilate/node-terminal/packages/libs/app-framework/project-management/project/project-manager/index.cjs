const fs = require('fs').promises; // Используем нативный fs.promises
const path = require('path');
const { FileSystemUtils } = require('@libs/system/file-operations'); // Новая утилита для работы с файловой системой
const { ProcessManagementUtils } = require('@libs/system/process-management'); // Новая утилита для управления процессами
const glob = require('glob');
const { ConfigurationUtils } = require('@libs/core/configuration');

class ProjectManager {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.configManager = options.configManager || new ConfigurationUtils({ logger: this.logger });
    this.processManagementUtils = options.processManagementUtils || new ProcessManagementUtils();

    this.PROJECTS_PATH = options.projectPaths?.projects; // Initialize directly from options
    this.SYSTEM_PATH = options.projectPaths?.system; // Initialize directly from options
  }

  async init() {
    if (this.PROJECTS_PATH && this.SYSTEM_PATH) { // Already initialized by options
      return;
    }
    try {
      const projectPathsConfig = await this.configManager.load('system-run.config.paths-config'); // Await the async load
      this.PROJECTS_PATH = this.PROJECTS_PATH || projectPathsConfig?.projects;
      this.SYSTEM_PATH = this.SYSTEM_PATH || projectPathsConfig?.system;
    } catch (error) {
      this.logger.error('ProjectManager: Ошибка загрузки project.paths из конфигурации:', error.message);
      throw error; // Перебрасываем ошибку, чтобы она была поймана выше
    }

    if (!this.PROJECTS_PATH) {
      this.logger.error('ProjectManager: PROJECT_PATHS не определен. Проекты не будут сканироваться.');
      throw new Error('PROJECT_PATHS не определен.');
    }
    if (!this.SYSTEM_PATH) {
      this.logger.warn('ProjectManager: SYSTEM_PATH не определен. Системные компоненты не будут сканироваться.');
    }
  }

  async getProjectsList() {
    await this.init(); // Ensure initialization
    const projects = [];
    
    // Сканирование проектов в opt/projects/
    const projectDirs = await FileSystemUtils.listDir(this.PROJECTS_PATH, { includeStats: true, depth: 1 }); // Используем FileSystemUtils.listDir
    for (const dirEntry of projectDirs) {
      const projectPath = dirEntry.path;
      const stats = dirEntry.stats;
      const dir = dirEntry.name;
      
      const packageJsonPath = path.join(projectPath, 'package.json');
      const composerJsonPath = path.join(projectPath, 'composer.json');
      const readmePath = path.join(projectPath, 'README.md');
      
      let projectInfo = {
        id: dir,
        name: dir,
        path: dir,
        type: 'project',
        category: 'opt-projects',
        size: stats.size,
        modified: stats.mtime,
        status: 'unknown',
        hasPackageJson: await FileSystemUtils.exists(packageJsonPath),
        hasComposerJson: await FileSystemUtils.exists(composerJsonPath),
        hasReadme: await FileSystemUtils.exists(readmePath)
      };
      
      if (projectInfo.hasPackageJson) {
        try {
          const packageJson = await FileSystemUtils.readJson(packageJsonPath);
          projectInfo.name = packageJson.name || dir;
          projectInfo.description = packageJson.description || '';
          projectInfo.version = packageJson.version || '';
          projectInfo.scripts = packageJson.scripts || {};
        } catch (error) {
          this.logger.warn(`Ошибка чтения package.json для ${dir}:`, error.message);
        }
      }
      
      if (projectInfo.hasComposerJson) {
        try {
          const composerJson = await FileSystemUtils.readJson(composerJsonPath);
          projectInfo.name = projectInfo.name || composerJson.name || dir;
          projectInfo.description = projectInfo.description || composerJson.description || '';
        } catch (error) {
          this.logger.warn(`Ошибка чтения composer.json для ${dir}:`, error.message);
        }
      }
      
      projects.push(projectInfo);
    }

    // Сканирование системных компонентов в usr/local/
    const systemDirs = await FileSystemUtils.listDir(this.SYSTEM_PATH, { includeStats: true, depth: 1 }); // Используем FileSystemUtils.listDir
    for (const dirEntry of systemDirs) {
      const systemPath = dirEntry.path;
      const stats = dirEntry.stats;
      const dir = dirEntry.name;
      
      const packageJsonPath = path.join(systemPath, 'package.json');
      
      let systemInfo = {
        id: `system-${dir}`,
        name: dir,
        path: dir,
        type: 'system',
        category: 'usr-local',
        size: stats.size,
        modified: stats.mtime,
        status: 'unknown',
        hasPackageJson: await FileSystemUtils.exists(packageJsonPath),
        hasReadme: await FileSystemUtils.exists(path.join(systemPath, 'README.md'))
      };
      
      if (systemInfo.hasPackageJson) {
        try {
          const packageJson = await FileSystemUtils.readJson(packageJsonPath);
          systemInfo.name = packageJson.name || dir;
          systemInfo.description = packageJson.description || '';
          systemInfo.version = packageJson.version || '';
          systemInfo.scripts = packageJson.scripts || {};
        } catch (error) {
          this.logger.warn(`Ошибка чтения package.json для системного компонента ${dir}:`, error.message);
        }
      }
      
      projects.push(systemInfo);
    }
    
    return projects;
  }

  async getProjectDetails(id) {
    let projectPath;
    let projectType;
    
    if (id.startsWith('system-')) {
      const systemName = id.replace('system-', '');
      projectPath = path.join(this.SYSTEM_PATH, systemName);
      projectType = 'system';
    } else {
      projectPath = path.join(this.PROJECTS_PATH, id);
      projectType = 'project';
    }
    
    if (!await FileSystemUtils.exists(projectPath)) {
      throw new Error('Проект не найден');
    }
    
    const stats = await FileSystemUtils.getStats(projectPath);
    const files = await FileSystemUtils.readDir(projectPath);
    
    let projectInfo = {
      id: id,
      name: id.replace('system-', ''),
      path: projectPath,
      type: projectType,
      size: stats.size,
      modified: stats.mtime,
      files: files,
      structure: {}
    };
    
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      const fileStats = await FileSystemUtils.getStats(filePath);
      
      if (fileStats.isDirectory()) {
        projectInfo.structure[file] = {
          type: 'directory',
          size: fileStats.size,
          modified: fileStats.mtime
        };
      } else {
        projectInfo.structure[file] = {
          type: 'file',
          size: fileStats.size,
          modified: fileStats.mtime,
          extension: path.extname(file)
        };
      }
    }
    
    const configFiles = ['package.json', 'composer.json', 'README.md', 'config.json'];
    for (const configFile of configFiles) {
      const configPath = path.join(projectPath, configFile);
      if (await FileSystemUtils.exists(configPath)) {
        try {
          if (configFile.endsWith('.json')) {
            projectInfo[configFile] = await FileSystemUtils.readJson(configPath);
          } else {
            projectInfo[configFile] = await FileSystemUtils.readFile(configPath, 'utf8');
          }
        } catch (error) {
          this.logger.warn(`Ошибка чтения ${configFile} для ${id}:`, error.message);
        }
      }
    }
    
    return projectInfo;
  }

  async startProject(id, script = 'start') {
    let projectPath;
    if (id.startsWith('system-')) {
      const systemName = id.replace('system-', '');
      projectPath = path.join(this.SYSTEM_PATH, systemName);
    } else {
      projectPath = path.join(this.PROJECTS_PATH, id);
    }
    
    if (!await FileSystemUtils.exists(projectPath)) {
      throw new Error('Проект не найден');
    }
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (await FileSystemUtils.exists(packageJsonPath)) {
      // Node.js проект
      const command = `npm run ${script}`;
      const { stdout, stderr } = await this.processManagementUtils.executeAsync(command, { cwd: projectPath }); // Используем executeAsync
      return { message: `Проект ${id} запущен`, output: stdout, stderr: stderr };
    } else {
      // Проверка на bat файлы
      const batFiles = glob.sync('*.bat', { cwd: projectPath });
      if (batFiles.length > 0) {
        const batFile = batFiles[0];
        const command = `${batFile}`;
        const { stdout, stderr } = await this.processManagementUtils.executeAsync(command, { cwd: projectPath }); // Используем executeAsync
        return { message: `Проект ${id} запущен через ${batFile}`, output: stdout, stderr: stderr };
      } else {
        throw new Error('Не найден способ запуска проекта: Отсутствуют package.json или bat файлы');
      }
    }
  }

  async stopProject(id) {
    // Здесь должна быть логика остановки проекта
    return { message: `Проект ${id} остановлен`, note: 'Функция остановки проектов в разработке' };
  }

  async getProjectStatus(id) {
    // Здесь должна быть логика проверки статуса
    return {
      id: id,
      status: 'unknown',
      uptime: 0,
      memory: 0,
      cpu: 0,
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = ProjectManager;
