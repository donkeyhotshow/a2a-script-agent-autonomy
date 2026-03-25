// Best-effort module-alias setup.
// Some terminal modules `require('../setup-module-alias.cjs')` unconditionally.
// If `module-alias` isn't installed or no aliases are configured, this file should be a safe no-op.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const moduleAlias = require('module-alias');
  if (typeof moduleAlias === 'function') {
    moduleAlias();
  }
} catch {
  // No-op: keep runtime working without module-alias.
}

