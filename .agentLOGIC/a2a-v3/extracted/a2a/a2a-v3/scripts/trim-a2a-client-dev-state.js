const fs = require('fs');
const path = require('path');
const p = path.resolve(__dirname, '..', 'a2a-client', 'DEV_STATE.md');
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
const start = lines.findIndex(l => l.trim().startsWith('### Large File Decomposition'));
if (start === -1) {
  console.log('section not found');
  process.exit(1);
}
const newLines = lines.slice(0, start);
fs.writeFileSync(p, newLines.join('\n') + '\n', 'utf8');
console.log('trimmed', newLines.length, 'lines');
