import { FrameworkDetector, DetectionResult, KeyFileInfo } from './types';

/**
 * Детектор TypeScript и JavaScript
 */
export class TypeScriptDetector implements FrameworkDetector {
  name = 'typescript';

  async detect(files: KeyFileInfo): Promise<DetectionResult | null> {
    // Проверка tsconfig.json
    if (files.tsConfig) {
      return {
        name: 'typescript',
        type: 'language',
        confidence: 0.95,
        indicators: ['tsconfig.json exists']
      };
    }

    // Проверка package.json на наличие TypeScript
    if (files.packageJson?.devDependencies?.typescript) {
      return {
        name: 'typescript',
        type: 'language',
        confidence: 0.9,
        indicators: ['package.json: typescript devDependency']
      };
    }

    // Проверка на Jest (testing framework)
    if (files.jestConfig || files.packageJson?.devDependencies?.jest) {
      return {
        name: 'jest',
        type: 'testing',
        confidence: 0.9,
        indicators: ['jest.config.* or package.json: jest']
      };
    }

    // Проверка на Vitest
    if (files.packageJson?.devDependencies?.vitest) {
      return {
        name: 'vitest',
        type: 'testing',
        confidence: 0.9,
        indicators: ['package.json: vitest']
      };
    }

    // Проверка на PHPUnit (PHP testing)
    if (files.phpUnitXml) {
      return {
        name: 'phpunit',
        type: 'testing',
        confidence: 0.95,
        indicators: ['phpunit.xml exists']
      };
    }

    // Проверка на Pest (Laravel testing)
    if (files.packageJson?.devDependencies?.pestphp || files.composerJson?.requireDev?.['pestphp/pest']) {
      return {
        name: 'pest',
        type: 'testing',
        confidence: 0.9,
        indicators: ['composer.json: pestphp/pest']
      };
    }

    // Проверка на Vite (build tool)
    if (files.viteConfig) {
      return {
        name: 'vite',
        type: 'build',
        confidence: 0.9,
        indicators: ['vite.config.* exists']
      };
    }

    // Проверка на Webpack
    if (files.webpackConfig) {
      return {
        name: 'webpack',
        type: 'build',
        confidence: 0.85,
        indicators: ['webpack.config.* exists']
      };
    }

    // Если нет TypeScript, но есть JS файлы - это JavaScript
    if (files.fileExtensions.includes('js')) {
      return {
        name: 'javascript',
        type: 'language',
        confidence: 0.7,
        indicators: ['JavaScript files detected']
      };
    }

    // Проверка на PHP (если есть .php файлы или composer.json)
    if (files.fileExtensions.includes('php') || files.composerJson) {
      return {
        name: 'php',
        type: 'language',
        confidence: 0.9,
        indicators: ['.php files or composer.json']
      };
    }

    return null;
  }
}