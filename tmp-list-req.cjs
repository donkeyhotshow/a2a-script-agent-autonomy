const fs = require('fs');
const path = require('path');
function walk(d) {
  let r = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) r = r.concat(walk(p));
    else if (e.name === 'request.json') r.push(p);
  }
  return r;
}
const all = walk('simulations');
const missing = all.filter((f) => !fs.readFileSync(f, 'utf8').includes('"execution"'));
console.log('total', all.length, 'missing execution', missing.length);
missing.forEach((f) => console.log(f));
