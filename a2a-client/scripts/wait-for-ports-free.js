const { execSync } = require('child_process');
const ports = process.argv.slice(2).map(p => parseInt(p, 10));

const MAX_RETRIES = 10;
const RETRY_DELAY = 1000;

function isPortInUse(port) {
  try {
    const output = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING') && line.includes(`:${port}`)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPortsFree() {
  for (const port of ports) {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      if (!isPortInUse(port)) {
        console.log(`Port ${port} is free`);
        break;
      }
      retries++;
      console.log(`Waiting for port ${port} to be released... (${retries}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY);
    }
    if (retries >= MAX_RETRIES) {
      console.warn(`Warning: Port ${port} may still be in use after ${MAX_RETRIES} attempts`);
    }
  }
}

waitForPortsFree().catch(console.error);
