const fs = require('fs');
const path = require('path');

function walkSteps(simRoot) {
  const steps = [];
  for (const name of fs.readdirSync(simRoot)) {
    const p = path.join(simRoot, name);
    if (!fs.statSync(p).isDirectory()) continue;
    if (!/^\d+(-sub-\d+)?$/.test(name)) continue;
    const rsp = path.join(p, 'response.json');
    const req = path.join(p, 'request.json');
    if (fs.existsSync(rsp)) {
      let j;
      try {
        j = JSON.parse(fs.readFileSync(rsp, 'utf8'));
      } catch {
        continue;
      }
      const ctx = j.context || {};
      steps.push({
        step: name,
        hasWorkbench: Object.prototype.hasOwnProperty.call(ctx, 'workbench'),
        hasHistory: Object.prototype.hasOwnProperty.call(ctx, 'history'),
        execKeys: j.execute && typeof j.execute === 'object' ? Object.keys(j.execute) : []
      });
    }
  }
  return steps;
}

const simDir = path.join(__dirname, 'simulations');
const sims = fs.readdirSync(simDir).filter((n) => {
  const p = path.join(simDir, n);
  return fs.statSync(p).isDirectory() && !n.startsWith('.');
});

const rows = [];
for (const sim of sims.sort()) {
  const root = path.join(simDir, sim);
  const steps = walkSteps(root);
  if (!steps.length) continue;
  const wb = steps.filter((s) => s.hasWorkbench).length;
  const mixed = wb > 0 && wb < steps.length;
  rows.push({ sim, total: steps.length, withWorkbench: wb, mixed, steps });
}

console.log('=== Sims with mixed workbench presence across steps (response.json) ===');
for (const r of rows.filter((x) => x.mixed)) {
  const miss = r.steps.filter((s) => !s.hasWorkbench).map((s) => s.step);
  console.log(r.sim, `workbench in ${r.withWorkbench}/${r.total}, missing in:`, miss.join(', '));
}

console.log('\n=== Sims with ZERO workbench in any response.json step ===');
for (const r of rows.filter((x) => x.withWorkbench === 0)) {
  console.log(r.sim);
}
