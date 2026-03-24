const fs = require('fs');
const path = require('path');

function walk(simRoot) {
  const out = [];
  for (const name of fs.readdirSync(simRoot)) {
    const p = path.join(simRoot, name);
    if (!fs.statSync(p).isDirectory()) continue;
    if (!/^\d+(-sub-\d+)?$/.test(name)) continue;
    const f = path.join(p, 'request.json');
    if (!fs.existsSync(f)) continue;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(f, 'utf8'));
    } catch {
      continue;
    }
    const ctx = j.context || {};
    out.push({
      step: name,
      hasWB: Object.prototype.hasOwnProperty.call(ctx, 'workbench')
    });
  }
  return out;
}

const simDir = path.join(__dirname, 'simulations');
for (const sim of fs.readdirSync(simDir).sort()) {
  const root = path.join(simDir, sim);
  if (!fs.statSync(root).isDirectory()) continue;
  const steps = walk(root);
  if (!steps.length) continue;
  const n = steps.filter((s) => s.hasWB).length;
  if (n === 0 || n === steps.length) continue;
  console.log(
    sim,
    `request workbench ${n}/${steps.length}, missing:`,
    steps.filter((s) => !s.hasWB).map((s) => s.step).join(', ')
  );
}
