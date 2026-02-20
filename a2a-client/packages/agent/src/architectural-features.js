/**
 * Architectural features detector - §3.3.2 requirements
 * Detects non-standard layout vs Laravel/Vue structure
 */

const path = require('path');
const fs = require('fs').promises;

const LARAVEL_STANDARD = {
  controllers: 'app/Http/Controllers',
  models: 'app/Models',
  services: 'app/Services',
  pages: 'resources/js/Pages',
  config: 'config',
};

/**
 * Detect architectural features for project
 * @param {string} projectPath - Project root
 * @param {Object} fsApi - { exists(relativePath): Promise<boolean> }
 * @returns {Promise<string[]>} Human-readable feature descriptions
 */
async function detectArchitecturalFeatures(projectPath, fsApi) {
  const features = [];
  const exists = (p) => fsApi.exists(p).catch(() => false);

  const hasStandardControllers = await exists(LARAVEL_STANDARD.controllers);
  const hasStandardModels = await exists(LARAVEL_STANDARD.models);
  const hasStandardServices = await exists(LARAVEL_STANDARD.services);
  const hasStandardPages = await exists(LARAVEL_STANDARD.pages);
  const hasStandardConfig = await exists(LARAVEL_STANDARD.config);

  const appDir = path.join(projectPath, 'app');
  try {
    const appEntries = await fs.readdir(appDir, { withFileTypes: true });
    const domainDir = appEntries.find((e) => e.isDirectory() && e.name === 'Domain');
    if (domainDir) {
      const domainPath = path.join(appDir, 'Domain');
      const domains = await fs.readdir(domainPath, { withFileTypes: true });
      for (const d of domains.filter((e) => e.isDirectory())) {
        const domainName = d.name;
        const subPath = path.join(domainPath, domainName);
        const subDirs = await fs.readdir(subPath, { withFileTypes: true }).catch(() => []);
        const hasDomainServices = subDirs.some((e) => e.isDirectory() && e.name === 'Services');
        const hasDomainModels = subDirs.some((e) => e.isDirectory() && e.name === 'Models');
        const hasDomainControllers = subDirs.some((e) => e.isDirectory() && e.name === 'Controllers');
        if (hasDomainServices && !hasStandardServices) {
          features.push(`Services расположены в app/Domain/${domainName}/Services вместо app/Services`);
        }
        if (hasDomainModels && !hasStandardModels) {
          features.push(`Модели в app/Domain/${domainName}/Models вместо app/Models`);
        }
        if (hasDomainControllers && !hasStandardControllers) {
          features.push(`Контроллеры в app/Domain/${domainName}/Controllers вместо app/Http/Controllers`);
        }
      }
    }
  } catch {
    // ignore
  }

  if (!hasStandardPages && (await exists('resources/views/pages'))) {
    features.push('Отсутствует директория resources/js/Pages — страницы в resources/views/pages');
  }
  if (!hasStandardConfig && (await exists('config/domain'))) {
    features.push('Конфиги в config/domain/* вместо корня config/');
  }

  return [...new Set(features)];
}

/**
 * Lightweight detection using only exists checks
 */
async function detectArchitecturalFeaturesLight(projectPath, fsApi) {
  const features = [];
  const exists = (p) => fsApi.exists(p).catch(() => false);

  if (!(await exists(LARAVEL_STANDARD.services)) && (await exists('app/Domain'))) {
    features.push('Services расположены в app/Domain/*/Services вместо app/Services');
  }
  if (!(await exists(LARAVEL_STANDARD.models)) && (await exists('app/Domain'))) {
    features.push('Модели в app/Domain/*/Models вместо app/Models');
  }
  if (!(await exists(LARAVEL_STANDARD.controllers)) && (await exists('app/Domain'))) {
    features.push('Отсутствует директория app/Http/Controllers — контроллеры в app/Domain/*/Controllers');
  }
  if (!(await exists(LARAVEL_STANDARD.pages)) && (await exists('resources/views/pages'))) {
    features.push('Отсутствует директория resources/js/Pages — страницы в resources/views/pages');
  }
  if (!(await exists('config')) && (await exists('config/domain'))) {
    features.push('Конфиги в config/domain/* вместо корня config/');
  }

  return features;
}

module.exports = {
  detectArchitecturalFeatures,
  detectArchitecturalFeaturesLight,
  LARAVEL_STANDARD,
};
