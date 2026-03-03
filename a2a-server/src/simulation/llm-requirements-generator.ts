import Handlebars from 'handlebars';
import type {ExecutionResult} from '../neurons-v2/types.js';
import type {LLMRequirementsSection} from './types.js';

export interface LLMRequirementsResult {
    needs: string[];
    renderedTemplate?: string;
}

const CONDITION_CONTAINS = /^([\w_]+)\s+contains\s+"([^"]+)"$/i;
const CONDITION_EXISTS = /^([\w_]+)\s+exists$/i;

export class LLMRequirementsGenerator {
    constructor(private templateEngine = Handlebars) {}

    generate(config: LLMRequirementsSection, executionResults: ExecutionResult[]): LLMRequirementsResult {
        const aggregated = this.aggregateData(executionResults);
        const needs = this.computeNeeds(config, executionResults, aggregated);
        const renderedTemplate = this.renderTemplate(config.template, {needs, ...aggregated});

        return {
            needs,
            renderedTemplate,
        };
    }

    private aggregateData(executionResults: ExecutionResult[]): Record<string, unknown> {
        const detectedIntents = executionResults.flatMap(res =>
            res.result?.intents?.map(intent => intent.type) ?? []
        );

        const frameworkInfo = executionResults
            .flatMap(res => res.result?.enrichments ?? [])
            .filter(enrichment => enrichment.key === 'framework')
            .map(enrichment => enrichment.value);

        const similarPatterns = executionResults
            .flatMap(res => res.result?.enrichments ?? [])
            .filter(enrichment => enrichment.key === 'codePattern')
            .map(enrichment => enrichment.value);

        const enrichments = executionResults.flatMap(res => res.result?.enrichments ?? []);

        return {
            detected_intents: detectedIntents,
            framework_info: frameworkInfo,
            similar_patterns: similarPatterns,
            enrichments,
        };
    }

    private computeNeeds(
        config: LLMRequirementsSection,
        executionResults: ExecutionResult[],
        aggregated: Record<string, unknown>
    ): string[] {
        const needsSet = new Set<string>();

        for (const result of executionResults) {
            for (const need of result.result?.needs ?? []) {
                needsSet.add(need);
            }
        }

        for (const rule of config.rules ?? []) {
            if (this.evaluateCondition(rule.condition, aggregated)) {
                for (const line of rule.add) {
                    const rendered = this.renderTemplate(line, aggregated);
                    if (rendered) {
                        needsSet.add(rendered);
                    }
                }
            }
        }

        const generated = Array.from(needsSet);
        return generated.slice(0, 10);
    }

    private renderTemplate(template: string, context: Record<string, unknown>): string {
        if (!template) {
            return '';
        }

        try {
            const compiled = this.templateEngine.compile(template);
            return compiled(context);
        } catch {
            return template;
        }
    }

    private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
        const containsMatch = CONDITION_CONTAINS.exec(condition);
        if (containsMatch) {
            const [, field, value] = containsMatch;
            const target = this.ensureList(data[field]);
            return target.some(item => String(item).toLowerCase().includes(value.toLowerCase()));
        }

        const existsMatch = CONDITION_EXISTS.exec(condition);
        if (existsMatch) {
            const [, field] = existsMatch;
            return Boolean(this.ensureList(data[field]).length);
        }

        return false;
    }

    private ensureList(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map(item => String(item));
        }

        if (value === undefined || value === null) {
            return [];
        }

        return [String(value)];
    }
}
