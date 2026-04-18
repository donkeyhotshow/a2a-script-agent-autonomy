/**
 * plugin-manager.ts — In-process plugin manager for the A2A orchestrator.
 *
 * Plugins are registered in-memory. For file-drop hot-loading, a file-watcher
 * layer can call load()/unload() when plugins appear/disappear in a watched dir.
 *
 * This is NOT exposed via any HTTP route. The server calls the orchestrator,
 * which internally uses the plugin manager.
 */

import type {
  PluginCommand,
  PluginCommandResult,
  PluginContext,
  PluginDefinition,
  PluginManager,
} from './plugin.interface.js'

function noopLogger(msg: string): void {
  // Replace with your logger in production
  // eslint-disable-next-line no-console
  console.log(`[plugin-manager] ${msg}`)
}

export class InProcessPluginManager implements PluginManager {
  private readonly plugins = new Map<string, PluginDefinition>()

  async load(plugin: PluginDefinition): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[plugin-manager] Plugin '${plugin.id}' is already registered`)
    }
    if (!/^[\w-]+$/.test(plugin.id)) {
      throw new Error(`[plugin-manager] Invalid plugin id '${plugin.id}' — must match /^[\\w-]+$/`)
    }
    this.plugins.set(plugin.id, plugin)
    noopLogger(`loaded plugin '${plugin.id}'`)
  }

  async unload(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return
    try {
      await plugin.dispose?.()
    } catch (err) {
      noopLogger(`dispose() threw for plugin '${pluginId}': ${String(err)}`)
    }
    this.plugins.delete(pluginId)
    noopLogger(`unloaded plugin '${pluginId}'`)
  }

  list(): string[] {
    return [...this.plugins.keys()]
  }

  getMatching(context: PluginContext): PluginDefinition[] {
    return [...this.plugins.values()].filter(
      (p) => typeof p.match !== 'function' || p.match(context),
    )
  }

  async applyTransforms(input: string, context: PluginContext): Promise<string> {
    let current = input
    for (const plugin of this.getMatching(context)) {
      if (typeof plugin.transform !== 'function') continue
      try {
        const transformed = await plugin.transform(current, context)
        if (typeof transformed === 'string') current = transformed
      } catch (err) {
        noopLogger(`plugin '${plugin.id}' transform() threw: ${String(err)}`)
      }
    }
    return current
  }

  async applyBeforeExecute(
    command: PluginCommand,
    context: PluginContext,
  ): Promise<PluginCommand> {
    let current = command
    for (const plugin of this.getMatching(context)) {
      if (typeof plugin.beforeExecute !== 'function') continue
      try {
        const modified = await plugin.beforeExecute(current, context)
        if (modified !== undefined) current = modified
      } catch (err) {
        noopLogger(`plugin '${plugin.id}' beforeExecute() threw: ${String(err)}`)
        // Rethrow — a plugin that blocks a command must be able to throw.
        throw err
      }
    }
    return current
  }

  async notifyAfterExecute(
    command: PluginCommand,
    result: PluginCommandResult,
    context: PluginContext,
  ): Promise<void> {
    await Promise.allSettled(
      this.getMatching(context).map(async (plugin) => {
        if (typeof plugin.afterExecute !== 'function') return
        await plugin.afterExecute(command, result, context)
      }),
    )
  }
}

/** Singleton instance for the orchestrator process. */
export const pluginManager: PluginManager = new InProcessPluginManager()
