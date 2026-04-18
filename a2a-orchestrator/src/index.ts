/**
 * a2a-orchestrator/src/index.ts — Orchestrator public API.
 *
 * The orchestrator is the coordination layer between the HTTP server and the
 * LLM / execution engine. It owns:
 *  - plugin-runtime: plugin lifecycle management, transform/hook pipeline
 *  - planning: dependency sorting, assembly planning
 *  - prompts: LLM prompt templates
 *
 * The HTTP server (a2a-server) calls the orchestrator; the orchestrator never
 * imports from the HTTP server.
 */

export { pluginManager } from './plugin-runtime/plugin-manager.js'
export type {
  PluginDefinition,
  PluginManager,
  PluginContext,
  PluginCommand,
  PluginCommandResult,
} from './plugin-runtime/plugin.interface.js'
