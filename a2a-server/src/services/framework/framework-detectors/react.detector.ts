import { FrameworkDetector, DetectionResult, KeyFileInfo } from './types';

/**
 * Детектор React фреймворков (React, Next.js)
 */
export class ReactDetector implements FrameworkDetector {
  name = 'react';

  async detect(files: KeyFileInfo): Promise<DetectionResult | null> {
    // Проверка package.json на наличие React
    if (files.packageJson?.dependencies?.react) {
      const reactVersion = files.packageJson.dependencies.react;
      
      // Проверка на Next.js
      if (files.hasNextConfig) {
        return {
          name: 'nextjs',
          type: 'frontend',
          version: files.packageJson.dependencies['next'] || 'unknown',
          confidence: 0.95,
          indicators: ['next.config.js exists', 'package.json: react']
        };
      }

      // Обычный React
      return {
        name: 'react',
        type: 'frontend',
        version: reactVersion,
        confidence: 0.9,
        indicators: ['package.json: react dependency']
      };
    }

    // Проверка на Angular (если есть angular.json)
    if (files.packageJson?.dependencies?.['@angular/core']) {
      return {
        name: 'angular',
        type: 'frontend',
        version: files.packageJson.dependencies['@angular/core'],
        confidence: 0.9,
        indicators: ['package.json: @angular/core']
      };
    }

    return null;
  }
}