import * as fs from 'fs';
import * as path from 'path';

export class SuggestionExportManager {
    private dataStore: any; // Assuming dataStore is passed or created
    private PLUGIN_NAME: string;
    private PLUGIN_VERSION: string;

    constructor(dataStore: any, pluginName: string, pluginVersion: string) {
        this.dataStore = dataStore;
        this.PLUGIN_NAME = pluginName;
        this.PLUGIN_VERSION = pluginVersion;
    }

    /**
     * Export suggestions
     */
    public exportSuggestions(format = 'json'): { success: boolean, error?: string, data?: string, filename?: string } {
        const data = this.dataStore.loadSuggestions();
        
        switch (format.toLowerCase()) {
            case 'json':
                return {
                    success: true,
                    data: JSON.stringify(data, null, 2),
                    filename: `project-suggestions_${new Date().toISOString().split('T')[0]}.json`
                };
            
            case 'csv':
                const csv = this.convertToCSV(data.suggestions);
                return {
                    success: true,
                    data: csv,
                    filename: `project-suggestions_${new Date().toISOString().split('T')[0]}.csv`
                };
            
            default:
                return {
                    success: false,
                    error: 'Unsupported export format'
                };
        }
    }

    /**
     * Convert to CSV
     */
    private convertToCSV(suggestions: any[]): string {
        const headers = ['ID', 'Suggestion', 'User', 'Category', 'Type', 'Status', 'Priority', 'Votes', 'Created At', 'Project'];
        const rows = suggestions.map(s => [
            s.id,
            `"${s.suggestion.replace(/"/g, '""')}"`,
            s.user,
            s.category,
            s.type,
            s.status,
            s.priority,
            s.votes,
            s.createdAt,
            s.projectPath || 'current-project'
        ]);
        
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
}
