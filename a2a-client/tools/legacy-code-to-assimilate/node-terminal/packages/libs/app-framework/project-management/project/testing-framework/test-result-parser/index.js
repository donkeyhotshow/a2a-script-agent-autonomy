/**
 * @fileoverview Test Result Parser - Общий парсер результатов тестов
 * @author Testing TaskManager Team
 * @version 1.0.0
 */

const fs = require("fs");
const path = require("path");

class TestResultParser {
  constructor() {
    this.results = {
      testName: "",
      status: "UNKNOWN",
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      duration: 0,
      timestamp: new Date().toISOString(),
      stdout: "",
      stderr: "",
    };
  }

  parseTestOutput(stdout, stderr = "") {
    this.results.stdout = stdout;
    this.results.stderr = stderr;

    const lines = stdout.split("\\n");

    const testNameMatch = stdout.match(/=== Running: (.+?) ===/);
    if (testNameMatch) {
      this.results.testName = testNameMatch[1];
    }

    let inResults = false;
    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine === "=== TEST RESULTS ===") {
        inResults = true;
        continue;
      }

      if (inResults) {
        if (trimmedLine.startsWith("Total:")) {
          this.results.total = parseInt(trimmedLine.split(":")[1]) || 0;
        } else if (trimmedLine.startsWith("Passed:")) {
          this.results.passed = parseInt(trimmedLine.split(":")[1]) || 0;
        } else if (trimmedLine.startsWith("Failed:")) {
          this.results.failed = parseInt(trimmedLine.split(":")[1]) || 0;
        } else if (trimmedLine.startsWith("Errors:")) {
          this.parseErrors(lines, lines.indexOf(line));
          break;
        }
      }
    }

    if (this.results.failed > 0) {
      this.results.status = "FAILED";
    } else if (this.results.passed > 0) {
      this.results.status = "PASSED";
    } else {
      this.results.status = "NO_TESTS";
    }

    return this.results;
  }

  parseErrors(lines, startIndex) {
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === "===================") {
        break;
      }

      if (line.startsWith("- ")) {
        this.results.errors.push(line.substring(2));
      }
    }
  }

  generateMarkdownReport(testId, filePath = null) {
    const timestamp = new Date().toISOString();
    const statusEmoji = this.getStatusEmoji();

    let report = `# Test Result Report

## Test Information
- **Test ID:** ${testId}
- **Test Name:** ${this.results.testName}
- **File Path:** ${filePath || "N/A"}
- **Timestamp:** ${timestamp}
- **Status:** ${statusEmoji} ${this.results.status}

## Test Summary
- **Total Tests:** ${this.results.total}
- **Passed:** ${this.results.passed} ✅
- **Failed:** ${this.results.failed} ❌
- **Success Rate:** ${this.results.total > 0 ? Math.round((this.results.passed / this.results.total) * 100) : 0}%

## Test Results
`;

    if (this.results.errors.length > 0) {
      report += `
### Errors
`;
      for (const error of this.results.errors) {
        report += `- ❌ ${error}\\n`;
      }
    }

    report += `
## Raw Output

### Standard Output
\`\`\`
${this.results.stdout}
\`\`\`
`;

    if (this.results.stderr) {
      report += `
### Standard Error
\`\`\`
${this.results.stderr}
\`\`\`
`;
    }

    report += `
---
*Report generated automatically by Test Result Parser*
`;

    return report;
  }

  getStatusEmoji() {
    switch (this.results.status) {
      case "PASSED":
        return "✅";
      case "FAILED":
        return "❌";
      case "NO_TESTS":
        return "⚠️";
      default:
        return "❓";
    }
  }
}

export default TestResultParser;
