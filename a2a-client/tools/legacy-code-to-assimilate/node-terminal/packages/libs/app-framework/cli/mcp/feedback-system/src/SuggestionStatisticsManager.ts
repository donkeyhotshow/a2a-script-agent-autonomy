import { SuggestionsData } from './SuggestionDataStore';

export class SuggestionStatisticsManager {
    private dataStore: any; // Assuming dataStore is passed or created
    private PLUGIN_NAME: string;
    private PLUGIN_VERSION: string;
    private feedbackPath: string;

    constructor(dataStore: any, pluginName: string, pluginVersion: string, feedbackPath: string) {
        this.dataStore = dataStore;
        this.PLUGIN_NAME = pluginName;
        this.PLUGIN_VERSION = pluginVersion;
        this.feedbackPath = feedbackPath;
    }

    /**
     * Get statistics
     */
    public getStatistics(): { success: boolean, error?: string, statistics?: any } {
        const data: SuggestionsData = this.dataStore.loadSuggestions();
        const suggestions = data.suggestions;
        
        const stats: any = {
            total: suggestions.length,
            byStatus: {},
            byCategory: {},
            byType: {},
            byPriority: {},
            topVoted: suggestions
                .sort((a: any, b: any) => b.votes - a.votes)
                .slice(0, 5)
                .map((s: any) => ({ id: s.id, suggestion: s.suggestion.substring(0, 50) + '...', votes: s.votes })),
            recent: suggestions
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((s: any) => ({ id: s.id, suggestion: s.suggestion.substring(0, 50) + '...', createdAt: s.createdAt })),
            pluginInfo: {
                name: this.PLUGIN_NAME,
                version: this.PLUGIN_VERSION,
                targetService: 'project-feedback'
            },
            directories: {
                feedback: this.feedbackPath
            }
        };

        // Count by statuses, categories, types, and priorities
        suggestions.forEach((s: any) => {
            stats.byStatus[s.status] = (stats.byStatus[s.status] || 0) + 1;
            stats.byCategory[s.category] = (stats.byCategory[s.category] || 0) + 1;
            stats.byType[s.type] = (stats.byType[s.type] || 0) + 1;
            stats.byPriority[s.priority] = (stats.byPriority[s.priority] || 0) + 1;
        });

        return {
            success: true,
            statistics: stats
        };
    }
}
