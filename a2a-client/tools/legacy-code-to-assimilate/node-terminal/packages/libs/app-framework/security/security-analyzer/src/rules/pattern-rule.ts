/**
 * @fileoverview Паттерн-правило безопасности
 * @author MCP Terminal Team
 * @version 2.0.0
 */

import { SecurityRule, SecuritySeverity } from '../types';

/**
 * Правило безопасности на основе регулярных выражений
 */
export class PatternSecurityRule implements SecurityRule {
  public readonly name: string;
  public readonly description: string;
  public readonly severity: SecuritySeverity;
  public readonly patterns: RegExp[];
  public readonly suggestions: string[];
  public readonly enabled: boolean;
  public readonly category?: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    name: string,
    description: string,
    severity: SecuritySeverity,
    patterns: RegExp[],
    suggestions: string[],
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
    this.suggestions = suggestions;
    this.enabled = options.enabled ?? true;
    this.category = options.category;
    this.metadata = options.metadata;
  }

  /**
   * Проверяет команду на соответствие паттернам
   */
  test(command: string): boolean {
    if (!this.enabled) {
      return false;
    }

    return this.patterns.some(pattern => pattern.test(command));
  }

  /**
   * Возвращает предложения для команды
   */
  getSuggestions(command: string): string[] {
    if (!this.test(command)) {
      return [];
    }

    return [...this.suggestions];
  }

  /**
   * Создает копию правила с новыми настройками
   */
  clone(options: Partial<{
    enabled: boolean;
    category: string;
    metadata: Record<string, unknown>;
  }> = {}): PatternSecurityRule {
    return new PatternSecurityRule(
      this.name,
      this.description,
      this.severity,
      this.patterns,
      this.suggestions,
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
      this.patterns.length > 0 &&
      this.suggestions.length > 0
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
      metadata: this.metadata
    };
  }
}
