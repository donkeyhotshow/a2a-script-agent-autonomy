import { createRequire } from 'module';

// ESM wrapper around CommonJS exports
const require = createRequire(import.meta.url);
const cjs = require('./index.cjs');

export const ProjectManager = cjs.ProjectManager;
export const projectManager = cjs.projectManager;
export const ProjectModel = cjs.ProjectModel;
export const projectModel = cjs.projectModel;
