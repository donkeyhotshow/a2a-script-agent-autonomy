/**
 * Action Registry - Service for loading and searching actions from MD and YAML files
 *
 * Реализация на основе плана: plans/action-scripts-integration.md
 * 
 * Supports:
 * - YAML format (DSL): definitions/yaml/actions/*.yaml
 * - MD format (legacy): definitions/*.md, definitions/***.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ActionDefinition, ActionMatch, SubAction, ActionContext } from './types.js';
import { parseAllActionsFromDirectory } from './action-parser.js';
import { DSL } from './dsl/index.js';
import type { ResolvedAction, ResolvedStep } from './dsl/index.js';

/**
 * Minimum match score threshold for action matching.
 * Actions with matchScore below this threshold are considered weak matches and filtered out.
 * Value 0.5 corresponds to at least one exact keyword match.
 */
export const MIN_MATCH_SCORE = 0.5;

/**
 * Action Registry - manages loading and searching actions from MD files
 */
export class ActionRegistry {
  private actions: Map<string, ActionDefinition> = new Map();
  private defaultDirectory: string;

  /**
   * YAML definitions directory
   */
  private yamlDirectory: string;

  /**
   * MD definitions directory (legacy)
   */
  private mdDirectory: string;

  /**
   * DSL instance for parsing YAML files
   */
  private dsl: DSL | null = null;

  /**
   * Create a new ActionRegistry
   * @param directoryPath - Optional path to directory with MD files. Defaults to src/actions/
   */
  constructor(directoryPath?: string) {
    // Default directory is src/actions/definitions relative to project root
    // Using process.cwd() ensures we get the correct path in both dev and production
    const basePath = directoryPath || path.resolve(process.cwd(), 'src/actions');
    
    this.defaultDirectory = directoryPath || path.resolve(process.cwd(), 'src/actions/definitions');
    this.yamlDirectory = path.join(basePath, 'definitions', 'yaml', 'actions');
    this.mdDirectory = path.join(basePath, 'definitions');
    
    console.log(`[ActionRegistry] Initialized with directories:`);
    console.log(`  - YAML: ${this.yamlDirectory}`);
    console.log(`  - MD: ${this.mdDirectory}`);
  }

  /**
   * Load all actions from both YAML and MD directories
   * YAML has priority over MD (if same ID exists in both, YAML wins)
   * @param dirPath - Optional path to directory. Uses default if not provided
   */
  async loadFromDirectory(dirPath?: string): Promise<void> {
    const directoryPath = dirPath || this.defaultDirectory;
    console.log(`[ActionRegistry] Loading actions from: ${directoryPath}`);

    try {
      // Initialize DSL parser
      const basePath = path.resolve(process.cwd(), 'src/actions');
      this.dsl = new DSL(basePath);
      
      // Clear existing actions
      this.actions.clear();

      // First, try to load from YAML (higher priority)
      const yamlActions = await this.loadYamlActions();
      console.log(`[ActionRegistry] Loaded ${yamlActions.length} actions from YAML`);
      
      for (const action of yamlActions) {
        this.actions.set(action.id, action);
      }

      // Then, load from MD (fallback)
      const mdActions = await this.loadMdActions(directoryPath);
      console.log(`[ActionRegistry] Loaded ${mdActions.length} actions from MD`);
      
      // Only add MD actions if they don't exist in YAML (YAML has priority)
      for (const action of mdActions) {
        if (!this.actions.has(action.id)) {
          this.actions.set(action.id, action);
        } else {
          console.log(`[ActionRegistry] Skipping MD action '${action.id}' - YAML version takes priority`);
        }
      }

      console.log(`[ActionRegistry] Total loaded: ${this.actions.size} actions`);
    } catch (error) {
      console.error(`[ActionRegistry] Error loading actions:`, error);
      throw error;
    }
  }

  /**
   * Load actions from YAML files (DSL format)
   */
  private async loadYamlActions(): Promise<ActionDefinition[]> {
    const actions: ActionDefinition[] = [];

    try {
      // Check if YAML directory exists
      await fs.access(this.yamlDirectory);
    } catch {
      console.log(`[ActionRegistry] YAML directory not found: ${this.yamlDirectory}`);
      return actions;
    }

    try {
      const yamlFiles = await this.collectYamlFiles(this.yamlDirectory);
      console.log(`[ActionRegistry] Found ${yamlFiles.length} YAML action files`);

      for (const filePath of yamlFiles) {
        try {
          const action = await this.parseYamlAction(filePath);
          if (action) {
            actions.push(action);
          }
        } catch (error) {
          console.error(`[ActionRegistry] Error parsing YAML action ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error(`[ActionRegistry] Error loading YAML actions:`, error);
    }

    return actions;
  }

  /**
   * Recursively collect all .yaml files from a directory
   */
  private async collectYamlFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.collectYamlFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`[ActionRegistry] Error reading directory ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Parse a YAML action file using DSL parser
   */
  private async parseYamlAction(filePath: string): Promise<ActionDefinition | null> {
    if (!this.dsl) {
      console.error('[ActionRegistry] DSL not initialized');
      return null;
    }

    try {
      // Parse and resolve the YAML action
      const resolvedAction = await this.dsl.processAction(filePath);
      
      // Convert DSLAction to ActionDefinition
      const actionDefinition = this.convertDslToActionDefinition(resolvedAction);
      
      console.log(`[ActionRegistry] Parsed YAML action: ${actionDefinition.id}`);
      return actionDefinition;
    } catch (error) {
      console.error(`[ActionRegistry] Error parsing YAML file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Convert resolved DSL action to ActionDefinition
   */
  private convertDslToActionDefinition(dslAction: ResolvedAction): ActionDefinition {
    
    // Convert steps
    const subActions: SubAction[] = dslAction.resolvedSteps.map((step: ResolvedStep) => {
      return {
        id: step.id,
        title: step.description || step.id,
        description: step.description || '',
        priority: 100, // Default priority
        input: this.formatInputDescription(step.resolvedInput),
        output: step.output || '',
        dsl: {
          script: step.resolvedScript,
          input: step.resolvedInput,
        },
        code: step.script || '',
      };
    });

    return {
      id: dslAction.id,
      title: (dslAction as unknown as { title?: string }).title || dslAction.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: (dslAction as unknown as { description?: string }).description || '',
      priority: 50, // YAML actions have higher priority
      triggers: (dslAction as unknown as { triggers?: string[] }).triggers || [],
      context: this.convertContext(dslAction.context),
      subActions,
    };
  }

  /**
   * Convert DSL context to ActionContext
   */
  private convertContext(dslContext?: Record<string, unknown>): ActionContext {
    const context: ActionContext = {};
    
    if (!dslContext) {
      return context;
    }

    if (dslContext['framework']) {
      context.framework = String(dslContext['framework']);
    }
    if (dslContext['build-tool']) {
      context.buildTool = String(dslContext['build-tool']);
    }
    if (dslContext['aliases']) {
      context.aliases = dslContext['aliases'] as Record<string, string>;
    }

    return context;
  }

  /**
   * Format input description for sub-action
   */
  private formatInputDescription(input: Record<string, unknown>): string {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      return '';
    }
    
    return entries
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  }

  /**
   * Load actions from MD files (legacy format)
   */
  private async loadMdActions(directoryPath: string): Promise<ActionDefinition[]> {
    return parseAllActionsFromDirectory(directoryPath);
  }

  /**
   * Get an action by its ID
   * @param id - Action identifier
   * @returns ActionDefinition or null if not found
   */
  getAction(id: string): ActionDefinition | null {
    const action = this.actions.get(id);
    return action || null;
  }

  /**
   * Get all loaded actions
   * @returns Array of all ActionDefinitions
   */
  getAllActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  /**
   * Find actions matching a task description using keyword search
   * @param taskDescription - Description to search for
   * @returns Array of ActionMatch sorted by matchScore (highest first)
   */
  findAction(taskDescription: string): ActionMatch[] {
    const matches: ActionMatch[] = [];
    const taskLower = taskDescription.toLowerCase();
    const taskWords = taskLower.split(/\s+/).filter(w => w.length > 2);

    for (const action of Array.from(this.actions.values())) {
      let matchScore = 0;
      const descLower = action.description.toLowerCase();
      const titleLower = action.title.toLowerCase();
      const triggersLower = (action.triggers || []).map(t => t.toLowerCase());

      let keywordMatches = 0;
      
      for (const word of taskWords) {
        // Check triggers first (highest weight)
        const triggerMatch = triggersLower.some(t => t.includes(word) || word.includes(t));
        if (triggerMatch) {
          matchScore += 0.7;
          keywordMatches++;
        }
        // Exact keyword match in description or title
        else if (descLower.includes(word) || titleLower.includes(word)) {
          matchScore += 0.5;
          keywordMatches++;
        } 
        // Partial match: action word contains the search term
        // Only match if action word is longer and contains the search term
        else if (word.length > 3) {
          const actionWords = [...descLower.split(/\s+/), ...titleLower.split(/\s+/)];
          const partialMatch = actionWords.some(w => w.length > 3 && w.includes(word));
          if (partialMatch) {
            matchScore += 0.3;
            keywordMatches++;
          }
        }
      }

      // Add priority score only if there are keyword matches
      // This prevents actions from matching based solely on priority
      // Priority is typically 1-100, lower = higher priority
      if (keywordMatches > 0 && action.priority > 0) {
        matchScore += 0.1 * (action.priority / 10);
      }

      // Only include matches above the minimum threshold
      if (matchScore >= MIN_MATCH_SCORE) {
        matches.push({
          action,
          matchScore
        });
      }
    }

    // Sort by matchScore descending
    matches.sort((a, b) => b.matchScore - a.matchScore);

    console.log(`[ActionRegistry] Found ${matches.length} matching actions for: "${taskDescription.substring(0, 50)}..."`);
    return matches;
  }

  /**
   * Reload all actions from the default directory
   */
  async reload(): Promise<void> {
    console.log(`[ActionRegistry] Reloading actions from: ${this.defaultDirectory}`);
    await this.loadFromDirectory();
  }

  /**
   * Get the count of loaded actions
   */
  get count(): number {
    return this.actions.size;
  }
}

// Singleton instance
let actionRegistryInstance: ActionRegistry | null = null;

/**
 * Get the singleton ActionRegistry instance
 * @param directoryPath - Optional directory path for first initialization
 * @returns ActionRegistry singleton
 */
export function getActionRegistry(directoryPath?: string): ActionRegistry {
  if (!actionRegistryInstance) {
    actionRegistryInstance = new ActionRegistry(directoryPath);
  }
  return actionRegistryInstance;
}

// Export singleton directly
export const actionRegistry = getActionRegistry();
