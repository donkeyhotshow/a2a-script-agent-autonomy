import { Suggestion } from './SuggestionDataStore';
import { SuggestionFilterUtils } from './SuggestionFilterUtils';

class FeedbackAnalytics {

    /**
     * Группировка предложений по указанному полю
     */
    public static groupSuggestions(suggestions: Suggestion[], groupBy: string): any {
        const groups: { [key: string]: Suggestion[] } = {};
        const filterUtils = new SuggestionFilterUtils();

        suggestions.forEach(suggestion => {
            const value = filterUtils.getNestedValue(suggestion, groupBy);
            const key = value !== undefined ? String(value) : 'undefined';
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(suggestion);
        });
        
        return Object.entries(groups).map(([key, items]) => ({
            group: key,
            count: items.length,
            items: items
        }));
    }

    /**
     * Расчет агрегированных данных
     */
    public static calculateAggregates(suggestions: Suggestion[]): any {
        if (suggestions.length === 0) return null;
        
        const votes = suggestions.map(s => {
            const vote = s.votes || 0;
            return typeof vote === 'number' ? vote : 0;
        });
        const priorities = suggestions.map(s => s.priority);
        const categories = suggestions.map(s => s.category);
        
        return {
            totalVotes: votes.reduce((sum, vote) => sum + vote, 0),
            averageVotes: votes.reduce((sum, vote) => sum + vote, 0) / votes.length,
            maxVotes: Math.max(...votes),
            minVotes: Math.min(...votes),
            priorityDistribution: this.countOccurrences(priorities),
            categoryDistribution: this.countOccurrences(categories),
            totalSuggestions: suggestions.length
        };
    }

    /**
     * Подсчет вхождений значений в массиве
     */
    private static countOccurrences(arr: any[]): { [key: string]: number } {
        return arr.reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as { [key: string]: number });
    }
}

export { FeedbackAnalytics };
