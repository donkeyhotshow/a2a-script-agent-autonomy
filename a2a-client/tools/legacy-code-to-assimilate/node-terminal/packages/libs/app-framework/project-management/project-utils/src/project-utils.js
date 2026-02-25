const fs = require('fs-extra');
const path = require('path');

/**
 * Получение информации о проекте
 */
async function getProjectInfo(projectPath) {
    try {
        const absolutePath = path.isAbsolute(projectPath) ? projectPath : path.join(process.cwd(), projectPath);
        
        if (!await fs.pathExists(absolutePath)) {
            throw new Error(`Проект не найден: ${projectPath}`);
        }

        const stats = await fs.stat(absolutePath);
        if (!stats.isDirectory()) {
            throw new Error(`Указанный путь не является директорией: ${projectPath}`);
        }

        const projectInfo = {
            path: absolutePath,
            name: path.basename(absolutePath),
            exists: true,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            files: [],
            directories: [],
            packageJson: null,
            gitInfo: null,
            configFiles: []
        };

        // Сканируем содержимое проекта
        const items = await fs.readdir(absolutePath);
        for (const item of items) {
            const itemPath = path.join(absolutePath, item);
            const itemStats = await fs.stat(itemPath);
            
            if (itemStats.isFile()) {
                projectInfo.files.push(item);
                
                // Проверяем специальные файлы
                if (item === 'package.json') {
                    try {
                        projectInfo.packageJson = await fs.readJson(itemPath);
                    } catch (e) {
                        projectInfo.packageJson = { error: 'Не удалось прочитать package.json' };
                    }
                }
                
                if (item === '.gitignore' || item === '.eslintrc.json' || item === 'tsconfig.json') {
                    projectInfo.configFiles.push(item);
                }
            } else if (itemStats.isDirectory()) {
                projectInfo.directories.push(item);
                
                // Проверяем Git репозиторий
                if (item === '.git') {
                    projectInfo.gitInfo = { isGitRepo: true };
                }
            }
        }

        return projectInfo;
    } catch (error) {
        return {
            path: projectPath,
            exists: false,
            error: error.message
        };
    }
}

/**
 * Получение системных данных проекта
 */
async function getProjectSystemData(projectPath) {
    try {
        const projectInfo = await getProjectInfo(projectPath);
        if (!projectInfo.exists) {
            return projectInfo;
        }

        const systemData = {
            ...projectInfo,
            nodeModules: null,
            dependencies: [],
            devDependencies: [],
            scripts: [],
            buildInfo: null,
            testInfo: null
        };

        // Анализируем node_modules
        const nodeModulesPath = path.join(projectInfo.path, 'node_modules');
        if (await fs.pathExists(nodeModulesPath)) {
            const nodeModulesStats = await fs.stat(nodeModulesPath);
            systemData.nodeModules = {
                exists: true,
                size: nodeModulesStats.size,
                modified: nodeModulesStats.mtime
            };
        }

        // Анализируем package.json
        if (projectInfo.packageJson && !projectInfo.packageJson.error) {
            const pkg = projectInfo.packageJson;
            
            if (pkg.dependencies) {
                systemData.dependencies = Object.keys(pkg.dependencies);
            }
            
            if (pkg.devDependencies) {
                systemData.devDependencies = Object.keys(pkg.devDependencies);
            }
            
            if (pkg.scripts) {
                systemData.scripts = Object.keys(pkg.scripts);
            }
        }

        // Анализируем build конфигурацию
        const buildConfigs = ['webpack.config.js', 'vite.config.js', 'rollup.config.js', 'gulpfile.js'];
        for (const config of buildConfigs) {
            const configPath = path.join(projectInfo.path, config);
            if (await fs.pathExists(configPath)) {
                systemData.buildInfo = { configFile: config };
                break;
            }
        }

        // Анализируем тестовую конфигурацию
        const testConfigs = ['jest.config.js', 'mocha.opts', '.nycrc', 'karma.conf.js'];
        for (const config of testConfigs) {
            const configPath = path.join(projectInfo.path, config);
            if (await fs.pathExists(configPath)) {
                systemData.testInfo = { configFile: config };
                break;
            }
        }

        return systemData;
    } catch (error) {
        return {
            path: projectPath,
            error: error.message
        };
    }
}

/**
 * Валидация проекта
 */
async function validateProject(projectPath, options = {}) {
    try {
        const projectInfo = await getProjectSystemData(projectPath);
        if (!projectInfo.exists) {
            return {
                valid: false,
                errors: [`Проект не найден: ${projectPath}`]
            };
        }

        const validation = {
            valid: true,
            warnings: [],
            errors: [],
            recommendations: []
        };

        // Проверяем наличие package.json
        if (!projectInfo.packageJson || projectInfo.packageJson.error) {
            validation.errors.push('Отсутствует или поврежден package.json');
            validation.valid = false;
        }

        // Проверяем зависимости
        if (projectInfo.dependencies.length === 0) {
            validation.warnings.push('Проект не имеет зависимостей');
        }

        // Проверяем скрипты
        if (projectInfo.scripts.length === 0) {
            validation.warnings.push('Проект не имеет скриптов');
        }

        // Проверяем наличие тестов
        if (!projectInfo.testInfo) {
            validation.recommendations.push('Рекомендуется добавить тестовую конфигурацию');
        }

        // Проверяем наличие README
        const readmeFiles = ['README.md', 'README.txt', 'readme.md'];
        let hasReadme = false;
        for (const readme of readmeFiles) {
            if (projectInfo.files.includes(readme)) {
                hasReadme = true;
                break;
            }
        }
        
        if (!hasReadme) {
            validation.recommendations.push('Рекомендуется добавить README файл');
        }

        // Проверяем Git репозиторий
        if (!projectInfo.gitInfo) {
            validation.recommendations.push('Рекомендуется инициализировать Git репозиторий');
        }

        return validation;
    } catch (error) {
        return {
            valid: false,
            errors: [error.message]
        };
    }
}

export { getProjectInfo,
    getProjectSystemData,
    validateProject };
