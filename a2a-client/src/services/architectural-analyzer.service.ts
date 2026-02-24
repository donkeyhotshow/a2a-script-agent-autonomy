import fs from 'fs/promises';
import path from 'path';
import { ArchitecturalFeature } from '../types/index.js';
import { logger } from '../utils/logger.js';

/**
 * Architectural Analyzer Service
 * Analyzes project structure and detects Laravel-specific patterns
 */

export interface AnalysisResult {
  framework: string;
  version?: string;
  features: ArchitecturalFeature[];
  deviations: Deviation[];
  recommendations: string[];
}

export interface Deviation {
  type: 'missing_directory' | 'unexpected_file' | 'naming_violation' | 'structure_issue';
  path: string;
  expected?: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DirectoryStructure {
  name: string;
  type: 'directory' | 'file';
  children?: DirectoryStructure[];
}

// Laravel standard directories
const LARAVEL_STANDARD_DIRS = [
  'app',
  'app/Http',
  'app/Http/Controllers',
  'app/Http/Middleware',
  'app/Models',
  'app/Services',
  'app/Repositories',
  'bootstrap',
  'config',
  'database',
  'database/migrations',
  'database/seeders',
  'public',
  'resources',
  'resources/views',
  'routes',
  'storage',
  'tests',
];

const analysisCache = new Map<string, AnalysisResult>();

/**
 * Analyze project structure
 */
export async function analyzeProject(projectId: string): Promise<AnalysisResult> {
  // В этой реализации считаем, что projectId указывает на путь проекта на диске.
  const projectPath = projectId;

  const [structure, standard, frameworkInfo, features, namingViolations] = await Promise.all([
    getDirectoryStructure(projectPath, 4),
    checkStandardStructure(projectPath),
    detectFramework(projectPath),
    extractFeatures(projectPath),
    detectNamingViolations(projectPath),
  ]);

  const deviations: Deviation[] = [];

  for (const missing of standard.missing) {
    deviations.push({
      type: 'missing_directory',
      path: missing,
      expected: missing,
      description: `Expected Laravel standard directory "${missing}" is missing.`,
      severity: missing.startsWith('app') || missing.startsWith('routes') ? 'high' : 'medium',
    });
  }

  deviations.push(...namingViolations);

  const recommendations: string[] = [];

  if (frameworkInfo.framework === 'laravel') {
    if (standard.missing.length > 0) {
      recommendations.push(
        'Создайте недостающие стандартные директории Laravel (app, routes, resources и т.д.).'
      );
    }
    if (namingViolations.length > 0) {
      recommendations.push('Приведите имена контроллеров/моделей/миграций к рекомендациям Laravel.');
    }
  } else if (frameworkInfo.framework === 'unknown') {
    recommendations.push(
      'Фреймворк не определён. Убедитесь, что структура проекта следует внутренним стандартам.'
    );
  }

  const result: AnalysisResult = {
    framework: frameworkInfo.framework,
    version: frameworkInfo.version,
    features: [
      ...features,
      {
        name: 'directory_structure',
        category: 'directory_structure',
        description: 'Detected project directory structure',
        metadata: { structure },
      },
    ],
    deviations,
    recommendations,
  };

  analysisCache.set(projectId, result);

  return result;
}

/**
 * Detect framework
 */
export async function detectFramework(projectPath: string): Promise<{
  framework: string;
  version?: string;
}> {
  // 1. Проверяем composer.json (Laravel/PHP)
  try {
    const composerPath = path.join(projectPath, 'composer.json');
    const composerRaw = await fs.readFile(composerPath, 'utf8');
    const composer = JSON.parse(composerRaw) as {
      require?: Record<string, string>;
    };

    const require = composer.require ?? {};

    if (require['laravel/framework']) {
      return {
        framework: 'laravel',
        version: require['laravel/framework'],
      };
    }
  } catch (error) {
    // composer.json может отсутствовать — это нормально
  }

  // 2. Проверяем package.json (frontend фреймворки)
  try {
    const packagePath = path.join(projectPath, 'package.json');
    const packageRaw = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(packageRaw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    const deps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };

    if (deps['@vue/runtime-core'] || deps['vue']) {
      return { framework: 'vue' };
    }
    if (deps['react'] || deps['react-dom']) {
      return { framework: 'react' };
    }
    if (deps['next']) {
      return { framework: 'next' };
    }
    if (deps['nuxt'] || deps['nuxt3']) {
      return { framework: 'nuxt' };
    }
  } catch (error) {
    // package.json может отсутствовать — это нормально
  }

  return { framework: 'unknown' };
}

/**
 * Get directory structure
 */
export async function getDirectoryStructure(
  projectPath: string,
  maxDepth?: number
): Promise<DirectoryStructure> {
  const depthLimit = typeof maxDepth === 'number' && maxDepth > 0 ? maxDepth : 5;

  async function walk(currentPath: string, depth: number): Promise<DirectoryStructure> {
    let stats;
    try {
      stats = await fs.stat(currentPath);
    } catch (error) {
      logger.warn('Failed to stat path while scanning directory structure.', {
        path: currentPath,
        error,
      });
      return {
        name: path.basename(currentPath),
        type: 'file',
      };
    }

    if (!stats.isDirectory() || depth >= depthLimit) {
      return {
        name: path.basename(currentPath),
        type: stats.isDirectory() ? 'directory' : 'file',
      };
    }

    const children: DirectoryStructure[] = [];

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Пропускаем скрытые и служебные директории
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules' || entry.name === 'vendor' || entry.name === 'storage') {
          continue;
        }

        const childPath = path.join(currentPath, entry.name);
        children.push(await walk(childPath, depth + 1));
      }
    } catch (error) {
      logger.warn('Failed to read directory while scanning structure.', {
        path: currentPath,
        error,
      });
    }

    return {
      name: path.basename(currentPath),
      type: 'directory',
      children,
    };
  }

  return walk(projectPath, 0);
}

/**
 * Check for standard Laravel directories
 */
export async function checkStandardStructure(
  projectPath: string
): Promise<{ present: string[]; missing: string[] }> {
  const present: string[] = [];
  const missing: string[] = [];

  await Promise.all(
    LARAVEL_STANDARD_DIRS.map(async (dir) => {
      const fullPath = path.join(projectPath, dir);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          present.push(dir);
        } else {
          missing.push(dir);
        }
      } catch {
        missing.push(dir);
      }
    })
  );

  return { present, missing };
}

/**
 * Extract architectural features
 */
export async function extractFeatures(
  projectPath: string
): Promise<ArchitecturalFeature[]> {
  const features: ArchitecturalFeature[] = [];

  // Custom service providers
  const providersPath = path.join(projectPath, 'app', 'Providers');
  try {
    const entries = await fs.readdir(providersPath);
    if (entries.length > 0) {
      features.push({
        name: 'custom_service_providers',
        category: 'custom_pattern',
        description: 'Custom service providers detected',
        path: 'app/Providers',
        metadata: { count: entries.length },
      });
    }
  } catch {
    // Папка может отсутствовать — это нормально
  }

  // Custom middleware
  const middlewarePath = path.join(projectPath, 'app', 'Http', 'Middleware');
  try {
    const entries = await fs.readdir(middlewarePath);
    if (entries.length > 0) {
      features.push({
        name: 'custom_middleware',
        category: 'custom_pattern',
        description: 'Custom HTTP middleware detected',
        path: 'app/Http/Middleware',
        metadata: { count: entries.length },
      });
    }
  } catch {
    // ignore
  }

  // Simple feature for routes
  const routesPath = path.join(projectPath, 'routes');
  try {
    const entries = await fs.readdir(routesPath);
    if (entries.length > 0) {
      features.push({
        name: 'routes_defined',
        category: 'directory_structure',
        description: 'Routes directory exists with route files',
        path: 'routes',
        metadata: { files: entries },
      });
    }
  } catch {
    // ignore
  }

  return features;
}

/**
 * Detect naming convention violations
 */
export async function detectNamingViolations(
  projectPath: string
): Promise<Deviation[]> {
  const deviations: Deviation[] = [];

  // Controllers: app/Http/Controllers
  const controllersDir = path.join(projectPath, 'app', 'Http', 'Controllers');
  try {
    const entries = await fs.readdir(controllersDir);
    for (const entry of entries) {
      if (!entry.endsWith('.php')) continue;
      if (!entry.endsWith('Controller.php')) {
        deviations.push({
          type: 'naming_violation',
          path: `app/Http/Controllers/${entry}`,
          expected: 'PascalCaseController.php',
          description: 'Controller name should end with "Controller.php" in PascalCase.',
          severity: 'medium',
        });
      }
    }
  } catch {
    // Директория может отсутствовать
  }

  // Models: app/Models
  const modelsDir = path.join(projectPath, 'app', 'Models');
  try {
    const entries = await fs.readdir(modelsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.php')) continue;
      const name = entry.replace(/\.php$/, '');
      if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
        deviations.push({
          type: 'naming_violation',
          path: `app/Models/${entry}`,
          description: 'Model name should be in PascalCase.',
          severity: 'low',
        });
      }
    }
  } catch {
    // ignore
  }

  // Migrations: database/migrations
  const migrationsDir = path.join(projectPath, 'database', 'migrations');
  try {
    const entries = await fs.readdir(migrationsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.php')) continue;
      if (!/^\d{4}_\d{2}_\d{2}_\d{6}_/.test(entry)) {
        deviations.push({
          type: 'naming_violation',
          path: `database/migrations/${entry}`,
          description:
            'Migration name should start with timestamp prefix (YYYY_MM_DD_HHMMSS_...).',
          severity: 'low',
        });
      }
    }
  } catch {
    // ignore
  }

  return deviations;
}

/**
 * Get cached analysis
 */
export async function getCachedAnalysis(projectId: string): Promise<AnalysisResult | null> {
  return analysisCache.get(projectId) ?? null;
}

/**
 * Save analysis results
 */
export async function saveAnalysisResults(
  projectId: string,
  result: AnalysisResult
): Promise<void> {
  analysisCache.set(projectId, result);
}

/**
 * Get feature by category
 */
export async function getFeaturesByCategory(
  projectId: string,
  category: 'directory_structure' | 'naming_convention' | 'custom_pattern'
): Promise<ArchitecturalFeature[]> {
  const cached = analysisCache.get(projectId);
  if (!cached) {
    return [];
  }

  return cached.features.filter((feature) => feature.category === category);
}
