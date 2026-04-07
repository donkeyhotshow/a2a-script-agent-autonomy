#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration - hardcoded as requested
const SERVICES = {
  'compat_llm': {
    port: 11435,
    startCmd: 'compat_llm serve',
    healthEndpoint: '/api/tags',
    dependencies: [],
    logfile: path.join(__dirname, '..', 'logs', 'compat_llm.log')
  },
  'ai-integration': {
    port: 11434,
    startCmd: 'cd ai-integration && npm run dev',
    healthEndpoint: '/health',
    dependencies: ['compat_llm'],
    logfile: path.join(__dirname, '..', 'ai-integration', 'logs', 'ai-integration.log')
  },
  'a2a-server': {
    port: 3000,
    startCmd: 'cd a2a-server && npm run dev',
    healthEndpoint: '/health',
    dependencies: ['ai-integration'],
    logfile: path.join(__dirname, '..', 'a2a-server', 'logs', 'a2a-server.log')
  },
  'client-api': {
    port: 3001,
    startCmd: 'cd a2a-client && npm run dev',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['a2a-server'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'client-api.log')
  },
  'web-ui': {
    port: 5173,
    startCmd: 'cd a2a-client && npm run dev:web',
    healthEndpoint: '/api/a2a/projects',
    dependencies: ['client-api'],
    logfile: path.join(__dirname, '..', 'a2a-client', 'logs', 'web-ui.log')
  }
};

const PID_FILE = path.join(__dirname, '..', '.pids.txt');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function isPortOpen(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    return output.includes(`:${port}`);
  } catch (e) {
    return false;
  }
}

async function checkHealth(serviceName) {
  const service = SERVICES[serviceName];
  const url = `http://localhost:${service.port}${service.healthEndpoint}`;

  try {
    const response = await fetch(url, { timeout: 5000 });
    return response.ok;
  } catch (e) {
    return false;
  }
}

function getRunningServices() {
  if (!fs.existsSync(PID_FILE)) return {};

  const content = fs.readFileSync(PID_FILE, 'utf8');
  const running = {};

  content.split('\n').forEach(line => {
    const match = line.match(/^(\w+)=(\d+)$/);
    if (match) {
      running[match[1]] = parseInt(match[2]);
    }
  });

  return running;
}

function savePid(serviceName, pid) {
  let content = '';
  if (fs.existsSync(PID_FILE)) {
    content = fs.readFileSync(PID_FILE, 'utf8');
  }
  const lines = content.split('\n').filter(line => !line.startsWith(`${serviceName}=`));
  lines.push(`${serviceName}=${pid}`);
  fs.writeFileSync(PID_FILE, lines.join('\n'));
}

function killProcess(pid) {
  try {
    if (os.platform() === 'win32') {
      execSync(`taskkill /F /PID ${pid}`);
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch (e) {
    // Process might already be dead
  }
}

function startService(serviceName) {
  return new Promise((resolve, reject) => {
    const service = SERVICES[serviceName];

    log(`Starting ${serviceName} on port ${service.port}...`);

    // Check if port is already in use
    if (isPortOpen(service.port)) {
      log(`Port ${service.port} is occupied. Checking if service is responding...`);

      checkHealth(serviceName).then(healthy => {
        if (healthy) {
          log(`${serviceName} is already running and healthy`);
          resolve();
        } else {
          log(`ERROR: ${serviceName} port occupied but service not responding`);
          log(`Check logfile: ${service.logfile}`);
          reject(new Error(`Service not responding on port ${service.port}`));
        }
      });
      return;
    }

    // Start the service
    const child = spawn(service.startCmd, {
      shell: true,
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    savePid(serviceName, child.pid);

    // Monitor stdout/stderr
    child.stdout.on('data', (data) => {
      log(`${serviceName}: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      log(`${serviceName} ERROR: ${data.toString().trim()}`);
    });

    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        log(`ERROR: ${serviceName} exited with code ${code}`);
        reject(new Error(`${serviceName} failed to start`));
      }
    });

    // Wait for service to be ready
    let attempts = 0;
    const checkReady = () => {
      checkHealth(serviceName).then(healthy => {
        if (healthy) {
          log(`✓ ${serviceName} started successfully (PID: ${child.pid})`);
          resolve();
        } else {
          attempts++;
          if (attempts < 30) { // 30 seconds timeout
            setTimeout(checkReady, 1000);
          } else {
            log(`ERROR: ${serviceName} failed health check after 30 seconds`);
            child.kill();
            reject(new Error(`${serviceName} health check failed`));
          }
        }
      }).catch(() => {
        attempts++;
        if (attempts < 30) {
          setTimeout(checkReady, 1000);
        } else {
          child.kill();
          reject(new Error(`${serviceName} health check failed`));
        }
      });
    };

    setTimeout(checkReady, 2000); // Initial delay
  });
}

function stopService(serviceName) {
  const running = getRunningServices();
  const pid = running[serviceName];

  if (pid) {
    log(`Stopping ${serviceName} (PID: ${pid})...`);
    killProcess(pid);

    // Remove from PID file
    const content = fs.readFileSync(PID_FILE, 'utf8');
    const lines = content.split('\n').filter(line => !line.startsWith(`${serviceName}=`));
    fs.writeFileSync(PID_FILE, lines.join('\n'));

    log(`✓ ${serviceName} stopped`);
  } else {
    log(`${serviceName} is not running`);
  }
}

function getDependencyOrder(services) {
  const result = [];
  const visited = new Set();

  function visit(serviceName) {
    if (visited.has(serviceName)) return;
    visited.add(serviceName);

    const service = SERVICES[serviceName];
    service.dependencies.forEach(dep => visit(dep));

    result.push(serviceName);
  }

  services.forEach(service => visit(service));

  return result;
}

async function startCommand(servicesToStart) {
  const allServices = Object.keys(SERVICES);
  const targetServices = servicesToStart.length > 0 ? servicesToStart : allServices;
  const order = getDependencyOrder(targetServices);

  log(`Starting services in order: ${order.join(', ')}`);

  for (const serviceName of order) {
    try {
      await startService(serviceName);
    } catch (error) {
      log(`Failed to start ${serviceName}: ${error.message}`);
      return;
    }
  }

  log('All services started successfully!');
  showStatus();
}

function stopCommand(servicesToStop) {
  const allServices = Object.keys(SERVICES);
  const targetServices = servicesToStop.length > 0 ? servicesToStop.reverse() : allServices.reverse(); // Stop in reverse order

  targetServices.forEach(service => stopService(service));
}

function showStatus() {
  const running = getRunningServices();

  log('Service Status:');
  Object.keys(SERVICES).forEach(serviceName => {
    const service = SERVICES[serviceName];
    const pid = running[serviceName];
    const portOpen = isPortOpen(service.port);

    let status = '🟡 Not running';
    if (pid && portOpen) {
      status = '🟢 Running';
    } else if (portOpen) {
      status = '🟠 Port occupied';
    }

    log(`  ${serviceName}: ${status} (Port: ${service.port}, PID: ${pid || 'N/A'})`);
  });
}

// Main CLI logic
const args = process.argv.slice(2);
const command = args[0];
const serviceArgs = args.slice(1);

switch (command) {
  case 'start':
    startCommand(serviceArgs);
    break;
  case 'stop':
    stopCommand(serviceArgs);
    break;
  case 'restart':
    stopCommand(serviceArgs);
    setTimeout(() => startCommand(serviceArgs), 2000);
    break;
  case 'status':
    showStatus();
    break;
  default:
    console.log('Usage: runbook-cli <command> [services...]');
    console.log('Commands: start, stop, restart, status');
    console.log('Services:', Object.keys(SERVICES).join(', '));
}</content>
<parameter name="filePath">bin/runbook-cli.js