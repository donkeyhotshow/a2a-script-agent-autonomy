import { SuggestionsData, Suggestion } from './SuggestionDataStore';
import { debugSystem, DEBUG_CATEGORIES } from '../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs';

export class SuggestionCrudOperations {
    private dataStore: any;
    private readonly MAX_SUGGESTIONS_PER_USER: number;
    private readonly MAX_SUGGESTION_LENGTH: number;
    private readonly PLUGIN_NAME: string;
    private readonly PROJECT_ROOT: string;

    constructor(dataStore: any, maxSuggestionsPerUser: number, maxSuggestionLength: number, pluginName: string, projectRoot: string) {
        this.dataStore = dataStore;
        this.MAX_SUGGESTIONS_PER_USER = maxSuggestionsPerUser;
        this.MAX_SUGGESTION_LENGTH = maxSuggestionLength;
        this.PLUGIN_NAME = pluginName;
        this.PROJECT_ROOT = projectRoot;
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Add a suggestion for the project
     */
    public addSuggestion(suggestion: string, user = 'anonymous', category = 'general', type = 'feedback'): { success: boolean, error?: string, suggestion?: any, message?: string } {
        // Input validation
        if (!suggestion || typeof suggestion !== 'string' || suggestion.trim().length === 0) {
            return {
                success: false,
                error: 'Suggestion must be text'
            };
        }

        if (suggestion.length > this.MAX_SUGGESTION_LENGTH) {
            return {
                success: false,
                error: `Suggestion too long (maximum ${this.MAX_SUGGESTION_LENGTH} characters)`
            };
        }

        const data = this.dataStore.loadSuggestions();
        
        // Check user suggestion limit
        const userSuggestions = data.suggestions.filter(s => s.user === user);
        if (userSuggestions.length >= this.MAX_SUGGESTIONS_PER_USER) {
            return {
                success: false,
                error: `Suggestion limit (${this.MAX_SUGGESTIONS_PER_USER}) reached for user ${user}`
            };
        }

        // Create new suggestion
        const newSuggestion: Suggestion = {
            id: this.generateId(),
            suggestion: suggestion.trim(),
            user: user || 'anonymous',
            category: category,
            type: type, // feedback, task, idea, bug, feature
            status: 'new',
            priority: 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            votes: 0,
            tags: [],
            targetService: 'project-feedback',
            pluginName: this.PLUGIN_NAME,
            projectPath: this.PROJECT_ROOT
        };

        data.suggestions.push(newSuggestion);

        if (this.dataStore.saveSuggestions(data)) {
            debugSystem.registerProblem({
                category: DEBUG_CATEGORIES.USER_FEEDBACK,
                title: 'New project suggestion',
                description: `Suggestion added by user ${user} for project`,
                context: {
                    suggestionId: newSuggestion.id,
                    category,
                    type,
                    user,
                    targetService: 'project-feedback'
                }
            });

            return {
                success: true,
                suggestion: newSuggestion,
                message: 'Project suggestion successfully added'
            };
        } else {
            return {
                success: false,
                error: 'Failed to save suggestion'
            };
        }
    }

    /**
     * Vote for a suggestion
     */
    public voteSuggestion(suggestionId: string, user: string, vote = 1): { success: boolean, error?: string, suggestion?: any, message?: string } {
        const data = this.dataStore.loadSuggestions();
        const suggestion = data.suggestions.find((s: any) => s.id === suggestionId);
        
        if (!suggestion) {
            return {
                success: false,
                error: 'Suggestion not found'
            };
        }

        suggestion.votes += vote;
        suggestion.updatedAt = new Date().toISOString();

        if (this.dataStore.saveSuggestions(data)) {
            return {
                success: true,
                suggestion: suggestion,
                message: 'Vote counted'
            };
        } else {
            return {
                success: false,
                error: 'Failed to save vote'
            };
        }
    }

    /**
     * Update suggestion status
     */
    public updateSuggestionStatus(suggestionId: string, status: string, adminUser = 'admin'): { success: boolean, error?: string, suggestion?: any, message?: string } {
        const data = this.dataStore.loadSuggestions();
        const suggestion = data.suggestions.find((s: any) => s.id === suggestionId);
        
        if (!suggestion) {
            return {
                success: false,
                error: 'Suggestion not found'
            };
        }

        const validStatuses = ['new', 'reviewing', 'approved', 'rejected', 'implemented', 'in-progress'];
        if (!validStatuses.includes(status)) {
            return {
                success: false,
                error: `Invalid status. Valid values: ${validStatuses.join(', ')}`
            };
        }

        suggestion.status = status;
        suggestion.updatedAt = new Date().toISOString();
        suggestion.updatedBy = adminUser;

        if (this.dataStore.saveSuggestions(data)) {
            return {
                success: true,
                suggestion: suggestion,
                message: `Status updated to: ${status}`
            };
        } else {
            return {
                success: false,
                error: 'Failed to update status'
            };
        }
    }
}
