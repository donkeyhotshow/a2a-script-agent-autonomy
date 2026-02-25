import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore
import { debugSystem, DEBUG_CATEGORIES } from '../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs';
import { SuggestionDataStore, SuggestionsData } from './SuggestionDataStore';
import { SuggestionFilterUtils } from './SuggestionFilterUtils';
import { SuggestionExportManager } from './SuggestionExportManager';
import { SuggestionStatisticsManager } from './SuggestionStatisticsManager';
import { SuggestionCrudOperations } from './SuggestionCrudOperations';

export class SuggestionManager {
    private feedbackPath: string;
    private projectRoot: string;
    private readonly FEEDBACK_FILE: string;
    public readonly MAX_SUGGESTIONS_PER_USER: number;
    public readonly MAX_SUGGESTION_LENGTH: number;
    private readonly PLUGIN_NAME: string;
    private readonly PLUGIN_VERSION: string;
    private dataStore: SuggestionDataStore;
    private filterUtils: SuggestionFilterUtils;
    private exportManager: SuggestionExportManager;
    private statisticsManager: SuggestionStatisticsManager;
    private crudOperations: SuggestionCrudOperations;

    constructor(feedbackPath: string, projectRoot: string, pluginName: string, pluginVersion: string, feedbackFile: string, maxSuggestionsPerUser: number, maxSuggestionLength: number) {
        this.feedbackPath = feedbackPath;
        this.projectRoot = projectRoot;
        this.PLUGIN_NAME = pluginName;
        this.PLUGIN_VERSION = pluginVersion;
        this.FEEDBACK_FILE = feedbackFile;
        this.MAX_SUGGESTIONS_PER_USER = maxSuggestionsPerUser;
        this.MAX_SUGGESTION_LENGTH = maxSuggestionLength;
        this.dataStore = new SuggestionDataStore(feedbackPath, feedbackFile, pluginName, pluginVersion);
        this.filterUtils = new SuggestionFilterUtils();
        this.exportManager = new SuggestionExportManager(this.dataStore, this.PLUGIN_NAME, this.PLUGIN_VERSION);
        this.statisticsManager = new SuggestionStatisticsManager(this.dataStore, this.PLUGIN_NAME, this.PLUGIN_VERSION, this.feedbackPath);
        this.crudOperations = new SuggestionCrudOperations(this.dataStore, this.MAX_SUGGESTIONS_PER_USER, this.MAX_SUGGESTION_LENGTH, this.PLUGIN_NAME, this.projectRoot);
    }

    /**
     * Load suggestions
     */
    public loadSuggestions(): SuggestionsData {
        return this.dataStore.loadSuggestions();
    }

    /**
     * Save suggestions
     */
    public saveSuggestions(data: SuggestionsData): boolean {
        return this.dataStore.saveSuggestions(data);
    }

    /**
     * Add a suggestion for the project
     */
    public addSuggestion(suggestion: string, user = 'anonymous', category = 'general', type = 'feedback'): { success: boolean, error?: string, suggestion?: any, message?: string } {
        return this.crudOperations.addSuggestion(suggestion, user, category, type);
    }

    /**
     * Get list of suggestions
     */
    public getSuggestions(filters: { 
        category?: string, 
        status?: string, 
        user?: string, 
        priority?: string, 
        type?: string, 
        sortBy?: string,
        nestedKey?: string,
        nestedValue?: any
    } = {}): { success: boolean, error?: string, suggestions?: any[], total?: number, metadata?: any } {
        const data = this.loadSuggestions();
        let suggestions = data.suggestions;

        // Apply filters
        if (filters.category) {
            suggestions = suggestions.filter(s => s.category === filters.category);
        }

        if (filters.status) {
            suggestions = suggestions.filter(s => s.status === filters.status);
        }

        if (filters.user) {
            suggestions = suggestions.filter(s => s.user === filters.user);
        }

        if (filters.priority) {
            suggestions = suggestions.filter(s => s.priority === filters.priority);
        }

        if (filters.type) {
            suggestions = suggestions.filter(s => s.type === filters.type);
        }

        // Filter by nested key
        if (filters.nestedKey && filters.nestedValue !== undefined) {
            suggestions = suggestions.filter(s => {
                const nestedValue = this.filterUtils.getNestedValue(s, filters.nestedKey!);
                return nestedValue === filters.nestedValue;
            });
        }

        // Sort
        if (filters.sortBy === 'votes') {
            suggestions.sort((a: any, b: any) => b.votes - a.votes);
        } else if (filters.sortBy === 'date') {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return {
            success: true,
            suggestions: suggestions,
            total: suggestions.length,
            metadata: data.metadata
        };
    }

    /**
     * Get suggestions by nested key
     * Allows exporting and editing data based on a narrower set of criteria
     */
    public getSuggestionsByNestedKey(nestedKey: string, nestedValue?: any, additionalFilters: { 
        category?: string, 
        status?: string, 
        user?: string, 
        priority?: string, 
        type?: string, 
        sortBy?: string 
    } = {}): { success: boolean, error?: string, suggestions?: any[], total?: number, metadata?: any } {
        if (!nestedKey) {
            return {
                success: false,
                error: 'Nested key must be specified'
            };
        }

        const data = this.loadSuggestions();
        let suggestions = data.suggestions;

        // Filter by nested key
        if (nestedValue !== undefined) {
            suggestions = suggestions.filter(s => {
                const value = this.filterUtils.getNestedValue(s, nestedKey);
                return value === nestedValue;
            });
        } else {
            // If value is not specified, return all entries that have this key
            suggestions = suggestions.filter(s => {
                const value = this.filterUtils.getNestedValue(s, nestedKey);
                return value !== undefined && value !== null;
            });
        }

        // Apply additional filters
        if (additionalFilters.category) {
            suggestions = suggestions.filter(s => s.category === additionalFilters.category);
        }

        if (additionalFilters.status) {
            suggestions = suggestions.filter(s => s.status === additionalFilters.status);
        }

        if (additionalFilters.user) {
            suggestions = suggestions.filter(s => s.user === additionalFilters.user);
        }

        if (additionalFilters.priority) {
            suggestions = suggestions.filter(s => s.priority === additionalFilters.priority);
        }

        if (additionalFilters.type) {
            suggestions = suggestions.filter(s => s.type === additionalFilters.type);
        }

        // Sort
        if (additionalFilters.sortBy === 'votes') {
            suggestions.sort((a: any, b: any) => b.votes - a.votes);
        } else if (additionalFilters.sortBy === 'date') {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return {
            success: true,
            suggestions: suggestions,
            total: suggestions.length,
            metadata: {
                ...data.metadata,
                nestedKey,
                nestedValue,
                filteredBy: 'nested_key'
            }
        };
    }

    /**
     * Get suggestions by extended nested key criteria
     * Supports multiple keys, ranges, patterns, and types
     */
    public getSuggestionsByNestedKeyExtended(params: {
        nestedKey?: string,
        nestedValue?: any,
        nestedKeys?: string[],
        nestedRange?: { min?: any, max?: any },
        nestedPattern?: string,
        nestedExists?: boolean,
        nestedType?: 'string' | 'number' | 'boolean' | 'array' | 'object',
        category?: string,
        status?: string,
        user?: string,
        priority?: string,
        type?: string,
        sortBy?: string
    }): { success: boolean, error?: string, suggestions?: any[], total?: number, metadata?: any } {
        const {
            nestedKey,
            nestedValue,
            nestedKeys,
            nestedRange,
            nestedPattern,
            nestedExists,
            nestedType,
            category,
            status,
            user,
            priority,
            type,
            sortBy
        } = params;

        if (!nestedKey && !nestedKeys) {
            return {
                success: false,
                error: 'At least one nested key must be specified'
            };
        }

        const data = this.loadSuggestions();
        let suggestions = data.suggestions;

        // Filter by nested keys
        suggestions = suggestions.filter(s => {
            // Multiple keys (OR logic)
            if (nestedKeys && nestedKeys.length > 0) {
                return nestedKeys.some(key => {
                    const value = this.filterUtils.getNestedValue(s, key);
                    return this.filterUtils.matchesExtendedCriteria(value, nestedValue, nestedRange, nestedPattern, nestedExists, nestedType);
                });
            }

            // Single key
            if (nestedKey) {
                const value = this.filterUtils.getNestedValue(s, nestedKey);
                return this.filterUtils.matchesExtendedCriteria(value, nestedValue, nestedRange, nestedPattern, nestedExists, nestedType);
            }

            return false;
        });

        // Apply additional filters
        if (category) {
            suggestions = suggestions.filter(s => s.category === category);
        }

        if (status) {
            suggestions = suggestions.filter(s => s.status === status);
        }

        if (user) {
            suggestions = suggestions.filter(s => s.user === user);
        }

        if (priority) {
            suggestions = suggestions.filter(s => s.priority === priority);
        }

        if (type) {
            suggestions = suggestions.filter(s => s.type === type);
        }

        // Sort
        if (sortBy === 'votes') {
            suggestions.sort((a: any, b: any) => b.votes - a.votes);
        } else if (sortBy === 'date') {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            suggestions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return {
            success: true,
            suggestions: suggestions,
            total: suggestions.length,
            metadata: {
                ...data.metadata,
                nestedKey,
                nestedValue,
                nestedKeys,
                nestedRange,
                nestedPattern,
                nestedExists,
                nestedType,
                filteredBy: 'nested_key_extended'
            }
        };
    }

    /**
     * Vote for a suggestion
     */
    public voteSuggestion(suggestionId: string, user: string, vote = 1): { success: boolean, error?: string, suggestion?: any, message?: string } {
        return this.crudOperations.voteSuggestion(suggestionId, user, vote);
    }

    /**
     * Update suggestion status
     */
    public updateSuggestionStatus(suggestionId: string, status: string, adminUser = 'admin'): { success: boolean, error?: string, suggestion?: any, message?: string } {
        return this.crudOperations.updateSuggestionStatus(suggestionId, status, adminUser);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        // This method is now in SuggestionCrudOperations
        return this.crudOperations.generateId();
    }

    /**
     * Export suggestions
     */
    public exportSuggestions(format = 'json'): { success: boolean, error?: string, data?: string, filename?: string } {
        return this.exportManager.exportSuggestions(format);
    }

    /**
     * Get statistics
     */
    public getStatistics(): { success: boolean, error?: string, statistics?: any } {
        return this.statisticsManager.getStatistics();
    }
}
