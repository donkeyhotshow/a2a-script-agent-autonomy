import { FrameworkDetector, DetectionResult, KeyFileInfo } from './types';

/**
 * Детектор Laravel фреймворка
 */
export class LaravelDetector implements FrameworkDetector {
  name = 'laravel';

  async detect(files: KeyFileInfo): Promise<DetectionResult | null> {
    // Проверка composer.json на наличие Laravel
    if (files.composerJson?.require?.['laravel/framework']) {
      const laravelVersion = files.composerJson.require['laravel/framework'];
      
      return {
        name: 'laravel',
        type: 'backend',
        version: laravelVersion,
        confidence: 0.95,
        indicators: ['composer.json: laravel/framework']
      };
    }

    // Проверка на наличие artisan файла
    if (files.hasArtisan) {
      return {
        name: 'laravel',
        type: 'backend',
        confidence: 0.8,
        indicators: ['artisan file exists']
      };
    }

    // Проверка на Symfony (если есть composer.json с symfony/framework-bundle)
    if (files.composerJson?.require?.['symfony/framework-bundle']) {
      return {
        name: 'symfony',
        type: 'backend',
        version: files.composerJson.require['symfony/framework-bundle'],
        confidence: 0.9,
        indicators: ['composer.json: symfony/framework-bundle']
      };
    }

    // Проверка на Express.js (Node.js backend)
    if (files.packageJson?.dependencies?.express) {
      return {
        name: 'express',
        type: 'backend',
        version: files.packageJson.dependencies.express,
        confidence: 0.85,
        indicators: ['package.json: express']
      };
    }

    // Проверка на NestJS
    if (files.packageJson?.dependencies?.['@nestjs/core']) {
      return {
        name: 'nestjs',
        type: 'backend',
        version: files.packageJson.dependencies['@nestjs/core'],
        confidence: 0.9,
        indicators: ['package.json: @nestjs/core']
      };
    }

    return null;
  }
}