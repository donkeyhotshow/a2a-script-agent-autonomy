/**
 * Rules Engine
 * Extracted from mcp applications
 */

class RulesEngine {
  constructor() {
    this.rules = new Map();
  }

  /**
   * Add rule
   */
  addRule(name, rule) {
    this.rules.set(name, rule);
  }

  /**
   * Evaluate rules
   */
  async evaluateRules(context) {
    const results = [];
    for (const [name, rule] of this.rules) {
      const result = await rule.evaluate(context);
      results.push({ name, result });
    }
    return results;
  }
}

export default RulesEngine;
