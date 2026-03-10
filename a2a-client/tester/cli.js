#!/usr/bin/env node

/**
 * A2A Web Client Tester CLI
 *
 * Command-line interface for managing and testing A2A web client
 * through API server commands.
 *
 * Usage:
 *   a2a-tester <command> [options]
 *
 * Commands:
 *   send       - Send command to web client
 *   panel      - Control panels (show/hide/move)
 *   session    - Manage sessions
 *   status     - Get web client status
 *   test       - Run automated tests
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fetch from 'node-fetch';

const program = new Command();

program
  .name('a2a-tester')
  .description('CLI tool for managing A2A web client via API commands')
  .version('1.0.0');

// Configuration
const DEFAULT_API_URL = process.env.A2A_API_URL || 'http://localhost:3001';
const DEFAULT_SESSION_ID = process.env.A2A_SESSION_ID || 'tester-session';

// Global state
let apiUrl = DEFAULT_API_URL;
let sessionId = DEFAULT_SESSION_ID;

/**
 * Initialize CLI with common options
 */
function setupCommonOptions(cmd) {
  return cmd
    .option('-u, --api-url <url>', 'API server URL', DEFAULT_API_URL)
    .option('-s, --session <id>', 'Session ID', DEFAULT_SESSION_ID)
    .option('-v, --verbose', 'Verbose output')
    .option('--json', 'Output JSON format');
}

/**
 * Send command to web client
 */
program
  .command('send <command>')
  .description('Send command to web client')
  .option('-d, --data <json>', 'Command data as JSON string')
  .option('-w, --wait', 'Wait for response')
  .action(async (command, options) => {
    try {
      const { apiUrl: url, session: sessId, data, wait, verbose } = { ...program.opts(), ...options };

      let commandData = {};
      if (data) {
        try {
          commandData = JSON.parse(data);
        } catch (e) {
          throw new Error(`Invalid JSON data: ${e.message}`);
        }
      }

      const payload = {
        type: 'tester_command',
        command,
        data: commandData,
        sessionId: sessId,
        timestamp: new Date().toISOString()
      };

      if (verbose) {
        console.log(chalk.gray('Sending command:'), JSON.stringify(payload, null, 2));
      }

      // Send via HTTP POST to API server
      const response = await fetch(`${url}/api/tester/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Command failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('✓ Command sent successfully'));
        if (result.message) {
          console.log(chalk.blue('Response:'), result.message);
        }
      }

    } catch (error) {
      console.error(chalk.red('✗ Command failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Control panels
 */
program
  .command('panel <action> [panelId]')
  .description('Control web client panels')
  .option('--x <x>', 'Panel X position')
  .option('--y <y>', 'Panel Y position')
  .option('--width <w>', 'Panel width')
  .option('--height <h>', 'Panel height')
  .action(async (action, panelId, options) => {
    const { apiUrl: url, session: sessId } = program.opts();

    const commandData = {
      action,
      panelId,
      position: {
        x: options.x ? parseInt(options.x) : undefined,
        y: options.y ? parseInt(options.y) : undefined
      },
      size: {
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined
      }
    };

    // Remove undefined values
    Object.keys(commandData).forEach(key => {
      if (commandData[key] === undefined) delete commandData[key];
    });

    await sendCommand('panel_control', commandData, { apiUrl: url, session: sessId });
  });

/**
 * Manage sessions
 */
program
  .command('session <action>')
  .description('Manage web client sessions')
  .option('-i, --id <id>', 'Session ID')
  .option('-t, --title <title>', 'Session title')
  .action(async (action, options) => {
    const { apiUrl: url, session: sessId } = program.opts();

    const commandData = {
      action,
      sessionId: options.id,
      title: options.title
    };

    await sendCommand('session_control', commandData, { apiUrl: url, session: sessId });
  });

/**
 * Get web client status
 */
program
  .command('status')
  .description('Get web client status')
  .action(async () => {
    const { apiUrl: url } = program.opts();

    try {
      const response = await fetch(`${url}/api/tester/status`);

      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (program.opts().json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(chalk.green('✓ Tester API Status:'));
        console.log(chalk.blue('  Service:'), result.data?.service || 'unknown');
        console.log(chalk.blue('  Sessions:'), result.data?.sessionCount || 0);
      }

    } catch (error) {
      console.error(chalk.red('✗ Status request failed:'), error.message);
      process.exit(1);
    }
  });

/**
 * Run automated tests
 */
program
  .command('test')
  .description('Run automated tests')
  .option('-s, --suite <name>', 'Test suite name')
  .option('--interactive', 'Run in interactive mode')
  .action(async (options) => {
    if (options.interactive) {
      await runInteractiveTests(options);
    } else {
      await runAutomatedTests(options);
    }
  });

/**
 * Helper function to send commands
 */
async function sendCommand(command, data, globalOptions) {
  const payload = {
    type: 'tester_command',
    command,
    data,
    sessionId: globalOptions.session,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(`${globalOptions.apiUrl}/api/tester/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Command failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (program.opts().json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(chalk.green('✓ Command executed successfully'));
      if (result.message) {
        console.log(chalk.blue('Response:'), result.message);
      }
      if (result.data) {
        console.log(chalk.gray('Data:'), JSON.stringify(result.data, null, 2));
      }
    }

  } catch (error) {
    console.error(chalk.red('✗ Command failed:'), error.message);
    process.exit(1);
  }
}

/**
 * Run interactive tests (simplified)
 */
async function runInteractiveTests(options) {
  console.log(chalk.blue('🧪 Interactive Test Mode'));
  console.log(chalk.gray('Running all test suites...\n'));

  const testSuites = ['panels', 'sessions', 'commands', 'performance'];

  for (const testSuite of testSuites) {
    console.log(chalk.yellow(`Running ${testSuite} tests...`));
    await runTestSuite(testSuite, options);
  }
}

/**
 * Run automated tests
 */
async function runAutomatedTests(options) {
  const suite = options.suite || 'all';
  console.log(chalk.blue(`🧪 Running ${suite} tests...`));

  await runTestSuite(suite, options);
}

/**
 * Run specific test suite
 */
async function runTestSuite(suite, options) {
  try {
    // Import test modules dynamically
    const testModule = await import(`./tests/${suite}.js`);
    await testModule.run({ ...program.opts(), ...options });
    console.log(chalk.green(`✓ ${suite} tests completed successfully`));
  } catch (error) {
    console.error(chalk.red(`✗ ${suite} tests failed:`), error.message);
  }
}

// Setup common options for all commands
setupCommonOptions(program);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nShutting down gracefully...'));
  if (wsConnection) {
    wsConnection.close();
  }
  process.exit(0);
});

// Parse command line arguments
program.parse();