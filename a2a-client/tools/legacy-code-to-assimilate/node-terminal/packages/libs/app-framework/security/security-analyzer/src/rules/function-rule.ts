/**
 * @fileoverview Функциональное правило безопасности
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { SecurityRule, SecuritySeverity } from '../types';

/**
 * Правило безопасности на основе функции проверки
 */
export class FunctionSecurityRule implements SecurityRule {
  public readonly name: string;
  public readonly description: string;
  public readonly severity: SecuritySeverity;
  public readonly patterns: RegExp[];
  public readonly suggestions: string[];
  public readonly enabled: boolean;
  public readonly category?: string;
  public readonly metadata?: Record<string, unknown>;

  private readonly testFunction: (command: string) => boolean;
  private readonly suggestionFunction: (command: string) => string[];

  constructor(
    name: string,
    description: string,
    severity: SecuritySeverity,
    testFunction: (command: string) => boolean,
    suggestionFunction: (command: string) => string[],
    patterns: RegExp[] = [],
    options: {
      enabled?: boolean;
      category?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) {
    this.name = name;
    this.description = description;
    this.severity = severity;
    this.patterns = patterns;
    this.suggestions = [];
    this.enabled = options.enabled ?? true;
    this.category = options.category;
    this.metadata = options.metadata;
    this.testFunction = testFunction;
    this.suggestionFunction = suggestionFunction;
  }

  /**
   * Проверяет команду с помощью функции
   */
  test(command: string): boolean {
    if (!this.enabled) {
      return false;
    }

    try {
      return this.testFunction(command);
    } catch (error) {
      console.error(`Error in security rule ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Возвращает предложения для команды
   */
  getSuggestions(command: string): string[] {
    if (!this.test(command)) {
      return [];
    }

    try {
      return this.suggestionFunction(command);
    } catch (error) {
      console.error(`Error getting suggestions for rule ${this.name}:`, error);
      return this.suggestions;
    }
  }

  /**
   * Создает копию правила с новыми настройками
   */
  clone(options: Partial<{
    enabled: boolean;
    category: string;
    metadata: Record<string, unknown>;
  }> = {}): FunctionSecurityRule {
    return new FunctionSecurityRule(
      this.name,
      this.description,
      this.severity,
      this.testFunction,
      this.suggestionFunction,
      this.patterns,
      {
        enabled: options.enabled ?? this.enabled,
        category: options.category ?? this.category,
        metadata: options.metadata ?? this.metadata
      }
    );
  }

  /**
   * Проверяет валидность правила
   */
  validate(): boolean {
    return (
      this.name.length > 0 &&
      this.description.length > 0 &&
      typeof this.testFunction === 'function' &&
      typeof this.suggestionFunction === 'function'
    );
  }

  /**
   * Возвращает JSON представление правила
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      severity: this.severity,
      patterns: this.patterns.map(p => p.source),
      suggestions: this.suggestions,
      enabled: this.enabled,
      category: this.category,
      metadata: this.metadata,
      type: 'function'
    };
  }
}
