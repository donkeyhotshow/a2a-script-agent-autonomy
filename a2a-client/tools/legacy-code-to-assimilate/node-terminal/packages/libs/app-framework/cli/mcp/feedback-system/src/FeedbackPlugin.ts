import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { debugSystem, DEBUG_CATEGORIES } from '../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs'; // Use relative path
import { SuggestionManager } from './SuggestionManager';
import { DocumentManager } from './DocumentManager';

/**
 * Project Feedback System Plugin
 * Collects suggestions and reports for projects where the session is running
 */
export class FeedbackPlugin {
    static PLUGIN_NAME = 'project-feedback-system';
    static PLUGIN_VERSION = '2.0.0';
    static FEEDBACK_DIR = 'feedback';
    static REPORTS_DIR = 'work/reports';
    static RULES_DIR = '.cursor/rules';
    static GUIDES_DIR = 'docs/guides';
    static FEEDBACK_FILE = 'suggestions.json';

    private isInitialized: boolean;
    private projectRoot: string;
    private feedbackPath: string;
    private reportsPath: string;
    private rulesPath: string;
    private guidesPath: string;
    private suggestionManager: SuggestionManager;
    private documentManager: DocumentManager;

    constructor() {
        this.isInitialized = false;
        this.projectRoot = path.resolve(__dirname, '..', '..', '..'); // Adjust path to root
        this.feedbackPath = path.join(this.projectRoot, FeedbackPlugin.FEEDBACK_DIR);
        this.reportsPath = path.join(this.projectRoot, FeedbackPlugin.REPORTS_DIR);
        this.rulesPath = path.join(this.projectRoot, FeedbackPlugin.RULES_DIR);
        this.guidesPath = path.join(this.projectRoot, FeedbackPlugin.GUIDES_DIR);
        this.suggestionManager = new SuggestionManager(
            this.feedbackPath,
            this.projectRoot,
            FeedbackPlugin.PLUGIN_NAME,
            FeedbackPlugin.PLUGIN_VERSION,
            FeedbackPlugin.FEEDBACK_FILE,
            50, // MAX_SUGGESTIONS_PER_USER
            5000 // MAX_SUGGESTION_LENGTH
        );
        this.documentManager = new DocumentManager(
            this.projectRoot,
            this.feedbackPath,
            this.reportsPath,
            this.rulesPath,
            this.guidesPath,
            FeedbackPlugin.PLUGIN_NAME,
            FeedbackPlugin.PLUGIN_VERSION
        );
    }

    /**
     * Initialize the plugin
     */
    public initialize(): { success: boolean, message?: string, error?: string, data?: any } {
        if (this.isInitialized) {
            return { success: true, message: 'Plugin already initialized' };
        }

        try {
            // Create all necessary directories
            fs.mkdirSync(this.feedbackPath, { recursive: true });
            fs.mkdirSync(this.reportsPath, { recursive: true });
            fs.mkdirSync(this.rulesPath, { recursive: true });
            fs.mkdirSync(this.guidesPath, { recursive: true });
            
            // Create plugin metadata file
            const pluginMeta = {
                pluginName: FeedbackPlugin.PLUGIN_NAME,
                version: FeedbackPlugin.PLUGIN_VERSION,
                description: 'System for collecting suggestions and reports for projects',
                targetService: 'project-feedback',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                directories: {
                    feedback: this.feedbackPath,
                    reports: this.reportsPath,
                    rules: this.rulesPath,
                    guides: this.guidesPath
                }
            };

            const metaPath = path.join(this.feedbackPath, 'plugin-meta.json');
            fs.writeFileSync(metaPath, JSON.stringify(pluginMeta, null, 2), 'utf8');

            this.isInitialized = true;
            
            debugSystem.registerProblem({
                category: DEBUG_CATEGORIES.USER_FEEDBACK,
                title: 'Feedback plugin initialized',
                description: `Plugin ${FeedbackPlugin.PLUGIN_NAME} successfully initialized for the project`,
                context: { pluginMeta }
            });

            return { 
                success: true, 
                message: 'Feedback plugin initialized for the project',
                data: pluginMeta
            };
        } catch (error: any) {
            debugSystem.registerProblem({
                category: DEBUG_CATEGORIES.FILE_SYSTEM_ERROR,
                title: 'Feedback plugin initialization error',
                description: `Failed to initialize plugin: ${error.message}`,
                errorDetails: error.message,
                context: { feedbackPath: this.feedbackPath }
            });

            return { 
                success: false, 
                error: `Initialization error: ${error.message}` 
            };
        }
    }

    /**
     * Create document by type
     */
    public createDocument(content: string, documentType: string, title: string, metadata: any = {}): { success: boolean, error?: string, filePath?: string, message?: string } {
        if (!this.isInitialized) {
            const initResult = this.initialize();
            if (!initResult.success) {
                return { success: false, error: initResult.error };
            }
        }
        return this.documentManager.createDocument(content, documentType, title, metadata);
    }

    /**
     * Get plugin information
     */
    public getPluginInfo(): {
        name: string;
        version: string;
        description: string;
        targetService: string;
        isInitialized: boolean;
        feedbackPath: string;
        reportsPath: string;
        rulesPath: string;
        guidesPath: string;
        maxSuggestionsPerUser: number;
        maxSuggestionLength: number;
    } {
        return {
            name: FeedbackPlugin.PLUGIN_NAME,
            version: FeedbackPlugin.PLUGIN_VERSION,
            description: 'System for collecting suggestions and reports for projects',
            targetService: 'project-feedback',
            isInitialized: this.isInitialized,
            feedbackPath: this.feedbackPath,
            reportsPath: this.reportsPath,
            rulesPath: this.rulesPath,
            guidesPath: this.guidesPath,
            maxSuggestionsPerUser: this.suggestionManager.MAX_SUGGESTIONS_PER_USER,
            maxSuggestionLength: this.suggestionManager.MAX_SUGGESTION_LENGTH
        };
    }

    // Методы, делегирующие вызовы SuggestionManager
    public addSuggestion(suggestion: string, user?: string, category?: string, type?: string) {
        return this.suggestionManager.addSuggestion(suggestion, user, category, type);
    }

    public getSuggestions(filters: any) {
        return this.suggestionManager.getSuggestions(filters);
    }

    public getSuggestionsByNestedKeyExtended(params: any) {
        return this.suggestionManager.getSuggestionsByNestedKeyExtended(params);
    }

    public voteSuggestion(suggestionId: string, user: string, vote?: number) {
        return this.suggestionManager.voteSuggestion(suggestionId, user, vote);
    }

    public updateSuggestionStatus(suggestionId: string, status: string, adminUser?: string) {
        return this.suggestionManager.updateSuggestionStatus(suggestionId, status, adminUser);
    }

    public getStatistics() {
        return this.suggestionManager.getStatistics();
    }

    public exportSuggestions(format?: string) {
        return this.suggestionManager.exportSuggestions(format);
    }
}

// Create a single instance of the plugin
export const feedbackPlugin = new FeedbackPlugin();
