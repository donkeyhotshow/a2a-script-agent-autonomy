/**
 * @fileoverview Библиотека для операций с файлами
 * Предоставляет функциональность для чтения, записи, редактирования и мониторинга файлов
 * @author MCP Team
 * @version 1.0.0
 */

const path = require('path');
const fsPromises = require('fs').promises;
const fs = require('fs'); // Для синхронных операций

const { default: PathUtils } = require('../path-utils/index.js');

let FileOperations;

const defaultPathUtils = new PathUtils();

/**
 * Фабрика для создания экземпляра FileSystemUtils с заданными логгером и pathUtils
 * @param {Object} logger - Логгер для записи сообщений
 * @param {Object} [pathUtils] - Экземпляр PathUtils для работы с путями (по умолчанию используется defaultPathUtils)
 * @returns {Object} Экземпляр FileSystemUtils с интегрированными утилитами
 */
function fileUtilsFactory(logger, pathUtils = defaultPathUtils) {
    if (!FileOperations) {
        FileOperations = require('./src/file-operations.cjs').FileOperations;
    }
    const fileOps = new FileOperations();

    // Возвращаем объект с методами, интегрированными с pathUtils и logger
    return {
        readFile: async (filePath, options = {}) => {
            try {
                const result = await fileOps.readFile(filePath, options);
                if (result.success) {
                    if (logger && logger.debug) {
                        logger.debug(`Файл прочитан: ${filePath}, размер: ${result.size || result.content?.length || 'неизвестно'} байт`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка чтения файла ${filePath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при чтении файла ${filePath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        writeFile: async (filePath, content, options = {}) => {
            try {
                const result = await fileOps.writeFile(filePath, content, options);
                if (result.success) {
                    if (logger && logger.debug) {
                        logger.debug(`Файл записан: ${filePath}, размер: ${result.size} байт`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка записи файла ${filePath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при записи файла ${filePath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        copyPath: async (sourcePath, destinationPath, options = {}) => {
            try {
                const result = await fileOps.copyPath(sourcePath, destinationPath, options);
                if (result.success) {
                    if (logger && logger.info) {
                        logger.info(`Путь скопирован: ${sourcePath} -> ${destinationPath}`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка копирования ${sourcePath} -> ${destinationPath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при копировании ${sourcePath} -> ${destinationPath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        movePath: async (sourcePath, destinationPath, options = {}) => {
            try {
                const result = await fileOps.movePath(sourcePath, destinationPath, options);
                if (result.success) {
                    if (logger && logger.info) {
                        logger.info(`Путь перемещен: ${sourcePath} -> ${destinationPath}`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка перемещения ${sourcePath} -> ${destinationPath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при перемещении ${sourcePath} -> ${destinationPath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        deletePath: async (targetPath, options = {}) => {
            try {
                const result = await fileOps.deletePath(targetPath, options);
                if (result.success) {
                    if (logger && logger.info) {
                        logger.info(`Путь удален: ${targetPath}`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка удаления ${targetPath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при удалении ${targetPath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        listDirectory: async (directoryPath, options = {}) => {
            try {
                const result = await fileOps.listDirectory(directoryPath, options);
                if (result.success) {
                    if (logger && logger.debug) {
                        logger.debug(`Директория прочитана: ${directoryPath}, файлов: ${result.count}`);
                    }
                } else {
                    if (logger && logger.error) {
                        logger.error(`Ошибка чтения директории ${directoryPath}: ${result.error}`);
                    }
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Исключение при чтении директории ${directoryPath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        // Дополнительные методы для совместимости
        ensureDir: async (dirPath, options = {}) => {
            try {
                const resolvedPath = pathUtils.resolve(dirPath);
                const result = await fileOps.writeFile(pathUtils.join(resolvedPath, '.temp'), '', { ensureDir: true });
                if (result.success) {
                    await fileOps.deletePath(pathUtils.join(resolvedPath, '.temp'));
                    if (logger && logger.debug) {
                        logger.debug(`Директория создана: ${resolvedPath}`);
                    }
                    return { success: true };
                }
                return result;
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка создания директории ${dirPath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        // Метод для проверки существования файла (используя pathUtils)
        fileExists: async (filePath) => {
            try {
                return await pathUtils.exists(filePath);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка проверки существования файла ${filePath}: ${error.message}`);
                }
                return false;
            }
        },

        // Метод для получения статистики файла/директории
        getFileStats: async (filePath) => {
            try {
                const result = await fileOps.getStats(filePath);
                if (logger && logger.debug) {
                    logger.debug(`Получена статистика для: ${filePath}`);
                }
                return result; // getStats уже возвращает { success, stats, error }
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка получения статистики файла ${filePath}: ${error.message}`);
                }
                return { success: false, error: error.message };
            }
        },

        // Методы совместимости с path для fileSystemUtils
        join: (...paths) => {
            try {
                return pathUtils.join(...paths);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка объединения путей: ${error.message}`);
                }
                throw error;
            }
        },

        resolve: (filePath) => {
            try {
                return pathUtils.resolve(filePath);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка разрешения пути: ${error.message}`);
                }
                throw error;
            }
        },

        dirname: (filePath) => {
            try {
                return pathUtils.getDirname(filePath);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка получения dirname: ${error.message}`);
                }
                throw error;
            }
        },

        existsSync: (filePath) => {
            try {
                return pathUtils.existsSync(filePath);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка проверки существования: ${error.message}`);
                }
                return false;
            }
        },

        mkdir: async (dirPath, options = {}) => {
            try {
                // Использование ensureDir вместо writeFile для создания директорий
                const result = await fileOps.ensureDir(dirPath, { recursive: true, ...options });
                if (!result.success && result.error.code !== 'EEXIST') {
                    throw new Error(result.error.message);
                }
                return { success: true };
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка создания директории ${dirPath}: ${error.message}`);
                }
                throw error;
            }
        },

        // Метод rm для совместимости с тестами
        rm: async (targetPath, options = {}) => {
            try {
                return await fileOps.deletePath(targetPath, options);
            } catch (error) {
                if (logger && logger.error) {
                    logger.error(`Ошибка удаления ${targetPath}: ${error.message}`);
                }
                throw error;
            }
        }
    };
}

// Экспортируем фабричную функцию
module.exports = fileUtilsFactory;
