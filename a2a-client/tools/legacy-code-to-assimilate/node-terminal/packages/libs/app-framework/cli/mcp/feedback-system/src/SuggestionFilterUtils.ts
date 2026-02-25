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
}

class SuggestionFilterUtils {

    /**
     * Check if value matches extended criteria
     */
    public matchesExtendedCriteria(value: any, expectedValue?: any, range?: { min?: any, max?: any }, pattern?: string, exists?: boolean, type?: string): boolean {
        // Check key existence
        if (exists !== undefined) {
            const hasValue = value !== undefined && value !== null;
            if (exists !== hasValue) {
                return false;
            }
        }

        // Check type
        if (type) {
            if (!this.matchesType(value, type)) {
                return false;
            }
        }

        // Check range (for numeric values)
        if (range && (range.min !== undefined || range.max !== undefined)) {
            if (typeof value !== 'number') {
                return false;
            }
            if (range.min !== undefined && value < range.min) {
                return false;
            }
            if (range.max !== undefined && value > range.max) {
                return false;
            }
        }

        // Check pattern (for string values)
        if (pattern) {
            if (typeof value !== 'string') {
                return false;
            }
            try {
                const regex = new RegExp(pattern);
                if (!regex.test(value)) {
                    return false;
                }
            } catch (error) {
                // Invalid regex pattern
                return false;
            }
        }

        // Check exact value
        if (expectedValue !== undefined) {
            return value === expectedValue;
        }

        // If no other criteria, return true
        return true;
    }

    /**
     * Check value type
     */
    public matchesType(value: any, expectedType: string): boolean {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true;
        }
    }

    /**
     * Get value by nested key
     * Supports dot notation: "metadata.pluginName", "tags.0", etc.
     */
    public getNestedValue(obj: any, path: string): any {
        if (!obj || !path) {
            return undefined;
        }

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }

            // Support array indices
            if (/^\d+$/.test(key)) {
                const index = parseInt(key);
                if (Array.isArray(current) && index >= 0 && index < current.length) {
                    current = current[index];
                } else {
                    return undefined;
                }
            } else {
                current = current[key];
            }
        }

        return current;
    }
}

export { SuggestionFilterUtils, Suggestion };
