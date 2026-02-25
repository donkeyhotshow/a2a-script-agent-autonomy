/**
 * Test Controller
 * Extracted from mcp applications
 */

class TestController {
  constructor() {
    this.tests = new Map();
  }

  /**
   * Add test
   */
  addTest(name, test) {
    this.tests.set(name, test);
  }

  /**
   * Run test
   */
  async runTest(name) {
    const test = this.tests.get(name);
    if (!test) {
      throw new Error('Test not found');
    }
    return await test.run();
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    const results = [];
    for (const [name, test] of this.tests) {
      const result = await test.run();
      results.push({ name, result });
    }
    return results;
  }
}

export default TestController;
