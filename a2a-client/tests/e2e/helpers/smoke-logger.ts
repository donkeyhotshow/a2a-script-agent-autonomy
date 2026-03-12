/**
 * Smoke Test Logger for web-ui-smoke tests
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  runId: string;
  timestamp: string;
  testName: string;
  status: 'passed' | 'failed';
  duration?: number;
  error?: string;
  services?: {
    server: boolean;
    clientApi: boolean;
    webUi: boolean;
    docker?: boolean;
  };
  infrastructure?: {
    dockerServices: boolean;
    serviceStartup: boolean;
  };
}

const LOG_DIR = path.join(__dirname, '..', 'logs', 'web-ui-smoke');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const runId = `web-ui-smoke-enhanced-${timestamp}`;

export class SmokeTestLogger {
  private results: TestResult[] = [];
  private startTime: Date;
  private infraLogStream: fs.WriteStream;

  constructor() {
    this.startTime = new Date();
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const infraLogPath = path.join(LOG_DIR, `infrastructure-${timestamp}.log`);
    this.infraLogStream = fs.createWriteStream(infraLogPath, { flags: 'a' });
    this.infraLogStream.write(`[${new Date().toISOString()}] Infrastructure logging started for run ${runId}\n`);
  }

  logTest(testName: string, status: 'passed' | 'failed', duration?: number, error?: string, services?: TestResult['services']) {
    this.results.push({
      runId,
      timestamp,
      testName,
      status,
      duration,
      error,
      services
    });
  }

  logInfrastructure(event: string, details?: any) {
    const ts = new Date().toISOString();
    const logEntry = `[${ts}] ${event}`;
    if (details) {
      this.infraLogStream.write(`${logEntry} - ${JSON.stringify(details)}\n`);
    } else {
      this.infraLogStream.write(`${logEntry}\n`);
    }
  }

  saveResults() {
    this.infraLogStream.end();

    const summary = {
      runId,
      timestamp,
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.status === 'passed').length,
      failedTests: this.results.filter(r => r.status === 'failed').length,
      duration: Date.now() - this.startTime!.getTime(),
      results: this.results,
      logs: {
        infrastructureLog: `infrastructure-${timestamp}.log`
      }
    };

    const logFile = path.join(LOG_DIR, `${runId}.json`);
    fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));
    console.log(`✓ Test results saved to: ${logFile}`);
    console.log(`✓ Infrastructure logs saved to: infrastructure-${timestamp}.log`);
  }
}

export const logger = new SmokeTestLogger();

