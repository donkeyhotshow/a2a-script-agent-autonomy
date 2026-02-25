/**
 * file-scanner.ignore integration tests (plan 4.2)
 */
const path = require('path');
const { filterByIgnore, scanWithIgnore } = require('../dist/file-scanner.ignore');
const IgnoreDetector = require('../dist/ignore-detector');

async function main() {
  const detector = new IgnoreDetector({ projectPath: process.cwd() });
  await detector.initialize();

  const scanResult = {
    files: [
      { path: '/x/foo.js', relativePath: 'foo.js' },
      { path: '/x/node_modules/a.js', relativePath: 'node_modules/a.js' },
    ],
    stats: { totalFiles: 2, skippedFiles: 0, totalDirs: 0, skippedDirs: 0, errors: [] },
    rootPath: '/x',
  };
  const filtered = filterByIgnore(scanResult, detector);
  if (filtered.files.length !== 1 || filtered.files[0].relativePath !== 'foo.js') {
    throw new Error('filterByIgnore: expected one file kept (foo.js), got ' + JSON.stringify(filtered.files.map(f => f.relativePath)));
  }
  console.log('filterByIgnore: OK');

  const result = await scanWithIgnore({ rootPath: path.join(__dirname, '..'), maxDepth: 2 });
  if (!result.files || !result.stats) throw new Error('scanWithIgnore: expected files and stats');
  console.log('scanWithIgnore: OK (files=' + result.files.length + ')');
  console.log('All file-scanner.ignore tests passed');
}

main().catch((e) => { console.error(e); process.exit(1); });
