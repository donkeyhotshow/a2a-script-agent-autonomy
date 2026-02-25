import EventEmitter from 'eventemitter3';
import { LoggingUtils } from '@libs/core/logging';
import { ErrorHandlingUtils } from '@libs/error-management/error-handler';
import { SharedUtils } from '@libs/core/shared';

export class PluginLifecycleManager {
    constructor(plugins, dependencies, hooks, config, logger, errorHandler) {
        this.plugins = plugins; // Map: name -> plugin
        this.dependencies = dependencies; // Map: pluginName -> dependencies[]
        this.hooks = hooks; // Map: hookName -> handlers[]
        this.config = config;
        this.logger = logger;
        this.errorHandler = errorHandler;
    }

    /**
     * Установка плагина
     */
    async installPlugin(pluginName, options = {}) {
        try {
            const plugin = this.plugins.get(pluginName);
            if (!plugin) {
                throw new Error(`Плагин ${pluginName} не найден`);
            }

            if (plugin.isInstalled) {
                this.logger.warn(`Плагин ${pluginName} уже установлен`);
                return false;
            }

            // Проверка зависимостей
            if (this.config.enableDependencyCheck) {
                await this.checkDependencies(pluginName);
            }

            // Выполнение хука beforeInstall
            await this.executeHook('beforeInstall', pluginName, options);

            // Установка плагина
            if (plugin.install) {
                await this.retryOperation(async () => {
                    await plugin.install(options);
                }, `Установка плагина ${pluginName}`);
            }

            // Обновление состояния
            plugin.isInstalled = true;
            plugin.installTime = Date.now();
            plugin.lastError = null;
            plugin.retryCount = 0;

            // this.stats.installedPlugins++; // Должно быть обновлено в PluginManager
            // this.loadOrder.push(pluginName);

            // Выполнение хука afterInstall
            await this.executeHook('afterInstall', pluginName, options);

            this.logger.info(`Плагин ${pluginName} успешно установлен`);
            // this.emit('plugin:installed', { pluginName, plugin }); // Должно быть в PluginManager

            return true;
        } catch (error) {
            const plugin = this.plugins.get(pluginName);
            if (plugin) {
                plugin.lastError = error.message;
                plugin.retryCount++;
                // this.stats.failedPlugins++; // Должно быть обновлено в PluginManager
            }

            this.errorHandler.handleError(error, {
                context: 'PluginLifecycleManager.installPlugin',
                pluginName
            });

            // this.emit('plugin:installFailed', { pluginName, error }); // Должно быть в PluginManager
            throw error;
        }
    }

    /**
     * Проверка зависимостей
     */
    async checkDependencies(pluginName) {
        const dependencies = this.dependencies.get(pluginName) || [];

        for (const dep of dependencies) {
            const depPlugin = this.plugins.get(dep);
            if (!depPlugin) {
                throw new Error(`Зависимость ${dep} не найдена для плагина ${pluginName}`);
            }

            if (!depPlugin.isInstalled) {
                throw new Error(`Зависимость ${dep} не установлена для плагина ${pluginName}`);
            }
        }
    }

    /**
     * Выполнение хука
     */
    async executeHook(hookName, pluginName, context = {}) {
        const handlers = this.hooks.get(hookName) || [];

        // Сортировка по приоритету
        const sortedHandlers = handlers
            .filter(h => h.pluginName === pluginName)
            .sort((a, b) => b.priority - a.priority);

        for (const { handler } of sortedHandlers) {
            try {
                await handler(context);
            } catch (error) {
                this.errorHandler.handleError(error, {
                    context: 'PluginLifecycleManager.executeHook',
                    hookName,
                    pluginName
                });
            }
        }
    }

    /**
     * Повторная попытка операции
     */
    async retryOperation(operation, description) {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                this.logger.warn(`${description} - попытка ${attempt}/${this.config.maxRetries}`, { error: error.message });

                if (attempt < this.config.maxRetries) {
                    await SharedUtils.wait(this.config.retryDelay * attempt); // Используем SharedUtils.wait
                }
            }
        }

        throw lastError;
    }

    /**
     * Включение плагина
     */
    async enablePlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Плагин ${pluginName} не найден`);
        }

        if (!plugin.isInstalled) {
            throw new Error(`Плагин ${pluginName} не установлен`);
        }

        if (plugin.isEnabled) {
            this.logger.warn(`Плагин ${pluginName} уже включен`);
            return false;
        }

        try {
            await this.executeHook('beforeEnable', pluginName);

            if (plugin.enable) {
                await plugin.enable();
            }

            plugin.isEnabled = true;
            await this.executeHook('afterEnable', pluginName);

            this.logger.info(`Плагин ${pluginName} включен`);
            // this.emit('plugin:enabled', { pluginName }); // Должно быть в PluginManager

            return true;
        } catch (error) {
            this.errorHandler.handleError(error, {
                context: 'PluginLifecycleManager.enablePlugin',
                pluginName
            });
            throw error;
        }
    }

    /**
     * Отключение плагина
     */
    async disablePlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Плагин ${pluginName} не найден`);
        }

        if (!plugin.isEnabled) {
            this.logger.warn(`Плагин ${pluginName} уже отключен`);
            return false;
        }

        try {
            await this.executeHook('beforeDisable', pluginName);

            if (plugin.disable) {
                await plugin.disable();
            }

            plugin.isEnabled = false;
            await this.executeHook('afterDisable', pluginName);

            this.logger.info(`Плагин ${pluginName} отключен`);
            // this.emit('plugin:disabled', { pluginName }); // Должно быть в PluginManager

            return true;
        } catch (error) {
            this.errorHandler.handleError(error, {
                context: 'PluginLifecycleManager.disablePlugin',
                pluginName
            });
            throw error;
        }
    }

    /**
     * Удаление плагина
     */
    async uninstallPlugin(pluginName) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Плагин ${pluginName} не найден`);
        }

        try {
            // Отключение плагина
            if (plugin.isEnabled) {
                await this.disablePlugin(pluginName);
            }

            await this.executeHook('beforeUninstall', pluginName);

            if (plugin.uninstall) {
                await plugin.uninstall();
            }

            // Удаление из регистрации (частично в PluginManager)
            // this.plugins.delete(pluginName);
            // this.dependencies.delete(pluginName);
            // this.loadOrder = this.loadOrder.filter(name => name !== pluginName);

            // Обновление статистики (частично в PluginManager)
            // this.stats.totalPlugins--;
            // if (plugin.isInstalled) {
            //   this.stats.installedPlugins--;
            // }

            await this.executeHook('afterUninstall', pluginName);

            this.logger.info(`Плагин ${pluginName} удален`);
            // this.emit('plugin:uninstalled', { pluginName }); // Должно быть в PluginManager

            return true;
        } catch (error) {
            this.errorHandler.handleError(error, {
                context: 'PluginLifecycleManager.uninstallPlugin',
                pluginName
            });
            throw error;
        }
    }
}
