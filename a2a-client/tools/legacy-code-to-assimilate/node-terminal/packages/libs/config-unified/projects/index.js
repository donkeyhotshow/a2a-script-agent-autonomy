import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { ProjectsConfigManager, projectsConfigManager } } = require('./index.cjs');

export { ProjectsConfigManager, projectsConfigManager };

