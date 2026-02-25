import * as fs from 'fs';
import * as path from 'path';
import { debugSystem, DEBUG_CATEGORIES } from '../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs';

interface Suggestion {
    id: string;
    suggestion: string;
    user: string;
    category: string;
    type: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    votes: number;
    tags: string[];
    targetService: string;
    pluginName: string;
    projectPath: string;
    updatedBy?: string;
}

interface SuggestionsData {
    suggestions: Suggestion[];
    metadata: {
        total: number;
        lastUpdated: string;
        version: string;
        pluginName: string;
        targetService: string;
        [key: string]: any;
    };
}

class SuggestionDataStore {
    private feedbackPath: string;
    private feedbackFile: string;
    private pluginName: string;
    private pluginVersion: string;

    constructor(feedbackPath: string, feedbackFile: string, pluginName: string, pluginVersion: string) {
        this.feedbackPath = feedbackPath;
        this.feedbackFile = feedbackFile;
        this.pluginName = pluginName;
        this.pluginVersion = pluginVersion;
    }

    /**
     * Load suggestions
     */
    public loadSuggestions(): SuggestionsData {
        const filePath = path.join(this.feedbackPath, this.feedbackFile);
        
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(data);
                // Ensure metadata structure is complete
                if (!parsed.metadata) {
                    parsed.metadata = {
                        total: parsed.suggestions?.length || 0,
                        lastUpdated: new Date().toISOString(),
                        version: this.pluginVersion,
                        pluginName: this.pluginName,
                        targetService: 'project-feedback'
                    };
                }
                return parsed;
            }
        } catch (error: any) {
            debugSystem.registerProblem({
                category: DEBUG_CATEGORIES.FILE_SYSTEM_ERROR,
                title: 'Error loading suggestions',
                description: `Failed to load suggestions file: ${filePath}`,
                errorDetails: error.message,
                context: { filePath }
            });
        }
        
        return {
            suggestions: [],
            metadata: {
                total: 0,
                lastUpdated: new Date().toISOString(),
                version: this.pluginVersion,
                pluginName: this.pluginName,
                targetService: 'project-feedback'
            }
        };
    }

    /**
     * Save suggestions
     */
    public saveSuggestions(data: SuggestionsData): boolean {
        const filePath = path.join(this.feedbackPath, this.feedbackFile);
        
        try {
            data.metadata.lastUpdated = new Date().toISOString();
            data.metadata.total = data.suggestions.length;
            data.metadata.pluginName = this.pluginName;
            data.metadata.targetService = 'project-feedback';
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error: any) {
            debugSystem.registerProblem({
                category: DEBUG_CATEGORIES.FILE_SYSTEM_ERROR,
                title: 'Error saving suggestions',
                description: `Failed to save suggestions: ${filePath}`,
                errorDetails: error.message,
                context: { filePath }
            });
            return false;
        }
    }
}

export { SuggestionDataStore, Suggestion, SuggestionsData };
