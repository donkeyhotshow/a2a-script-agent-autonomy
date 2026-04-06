/**
 * Feedback Handler - Manages relevance feedback and suggestions
 */

import { SearchSuggestionsEngine, SuggestionItem, QueryExpander } from '../suggestions.js';

export class FeedbackHandler {
    private suggestions: SearchSuggestionsEngine;
    private queryExpander: QueryExpander;
    private relevanceFeedbackEnabled: boolean;

    constructor(suggestions: SearchSuggestionsEngine, queryExpander: QueryExpander, relevanceFeedbackEnabled: boolean) {
        this.suggestions = suggestions;
        this.queryExpander = queryExpander;
        this.relevanceFeedbackEnabled = relevanceFeedbackEnabled;
    }

    /**
     * Get search suggestions for autocomplete
     */
    getSuggestions(query: string, options: { limit?: number } = {}): SuggestionItem[] {
        return this.suggestions.getSuggestions(query, options);
    }

    /**
     * Report click feedback to improve future ranking
     * Call this when user clicks/selects a search result
     * @param query The original search query
     * @param resultId The ID of the clicked result (file path or chunk ID)
     */
    reportClick(query: string, resultId: string): void {
        if (!this.relevanceFeedbackEnabled) return;

        // Learn from this interaction - strengthens relationship between query terms and result
        this.queryExpander.learn(query, resultId);

        console.log(`[RAG] Feedback recorded: "${query.substring(0, 50)}" -> ${resultId}`);
    }

    /**
     * Get expanded query terms based on learned relevance
     */
    expandQuery(query: string): string[] {
        return this.queryExpander.expand(query);
    }

    /**
     * Enable/disable relevance feedback learning
     */
    setRelevanceFeedback(enabled: boolean): void {
        this.relevanceFeedbackEnabled = enabled;
    }

    /**
     * Get suggestions by type (function, class, method, etc.)
     */
    getSuggestionsByType(type: string, limit = 10): SuggestionItem[] {
        return this.suggestions.getByType(type, limit);
    }
}