/**
 * plugin.interface.ts — Minimal plugin runtime interface for the A2A orchestrator.
 *
 * Plugins are the correct replacement for server-side skills / SkillRegistry.
 * They live in the orchestrator layer and are never exposed via server HTTP routes.
 *
 * Design principles:
 * - Plugins are loaded by PluginManager, not by the HTTP server.
 * - Each plugin is a self-contained unit with a unique id.
 * - Plugins intercept the orchestrator processing pipeline via hooks.
 * - Plugins can be added/removed without restarting the server.
 *
 * Reference: a2a-orchestrator/tasks/cancelled/server-skill-evolution-endpoint.md
 */

// ── Execution context passed to all plugin hooks ──────────────────────────────

export interface PluginContext {
  /** A2A session identifier. */
  sessionId: string;
  /** Raw task text from the user (if available at this stage). */
  task?: string;
  /** Current stage / FSM state name. */
  stage?: string;
  /** Arbitrary key-value metadata from the orchestrator. */
  metadata: Record<string, unknown>;
}

// ── Command representation for beforeExecute / afterExecute ──────────────────

export interface PluginCommand {
  /** The raw command string (shell command, MCP call, etc.). */
  raw: string;
  /** Parsed command type: 'shell' | 'mcp' | 'script' | unknown */
  type: string;
  /** Working directory at the time of execution. */
  cwd?: string;
}

export interface PluginCommandResult {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: Error;
}

// ── Plugin lifecycle interface ────────────────────────────────────────────────

export interface PluginDefinition {
  /**
   * Unique identifier for this plugin (e.g. 'command-normalizer', 'git-auto-commit').
   * Must match /^[\w-]+$/.
   */
  readonly id: string;

  /**
   * Human-readable name displayed in operator dashboard.
   */
  readonly name?: string;

  /**
   * Returns true when this plugin should activate for the given context.
   * If absent, the plugin always activates.
   */
  match?(context: PluginContext): boolean;

  /**
   * Transform the raw user input before it reaches the LLM.
   * Can be used to inject context, rewrite the task, or add memory snippets.
   * Return `undefined` to leave input unchanged.
   */
  transform?(input: string, context: PluginContext): string | undefined | Promise<string | undefined>;

  /**
   * Called immediately before a command is executed.
   * Can normalize the command, block it (throw), or return a modified version.
   * Return `undefined` to leave the command unchanged.
   */
  beforeExecute?(
    command: PluginCommand,
    context: PluginContext,
  ): PluginCommand | undefined | Promise<PluginCommand | undefined>;

  /**
   * Called immediately after a command completes.
   * Can inspect results, record evidence, or trigger follow-up actions.
   */
  afterExecute?(
    command: PluginCommand,
    result: PluginCommandResult,
    context: PluginContext,
  ): void | Promise<void>;

  /**
   * Called when the plugin is being unloaded (hot-remove).
   * Release any resources (timers, watchers, connections).
   */
  dispose?(): void | Promise<void>;
}

// ── Plugin manager interface ──────────────────────────────────────────────────

export interface PluginManager {
  /**
   * Load and register a plugin. Throws if a plugin with the same id is already registered.
   */
  load(plugin: PluginDefinition): Promise<void>;

  /**
   * Unload and dispose a plugin by id. Noop if not found.
   */
  unload(pluginId: string): Promise<void>;

  /**
   * Return all currently active plugin ids.
   */
  list(): string[];

  /**
   * Return matching plugins for a given context.
   */
  getMatching(context: PluginContext): PluginDefinition[];

  /**
   * Run `transform` on all matching plugins in registration order.
   * Each plugin sees the output of the previous one.
   */
  applyTransforms(input: string, context: PluginContext): Promise<string>;

  /**
   * Run `beforeExecute` on all matching plugins.
   * Each plugin sees the (possibly modified) command from the previous one.
   */
  applyBeforeExecute(command: PluginCommand, context: PluginContext): Promise<PluginCommand>;

  /**
   * Run `afterExecute` on all matching plugins in parallel (best-effort).
   */
  notifyAfterExecute(
    command: PluginCommand,
    result: PluginCommandResult,
    context: PluginContext,
  ): Promise<void>;
}
