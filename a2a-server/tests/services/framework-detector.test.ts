import { describe, it, expect, beforeEach } from 'vitest';
import { FrameworkDetectorService } from '../../src/services/framework-detector.service';
import { KeyFileScanner } from '../../src/services/framework-detectors/key-file-scanner';
import { VueDetector } from '../../src/services/framework-detectors/vue.detector';
import { ReactDetector } from '../../src/services/framework-detectors/react.detector';
import { LaravelDetector } from '../../src/services/framework-detectors/laravel.detector';
import { TypeScriptDetector } from '../../src/services/framework-detectors/typescript.detector';

describe('FrameworkDetectorService', () => {
  let detectorService: FrameworkDetectorService;
  let mockKeyFileScanner: KeyFileScanner;

  beforeEach(() => {
    detectorService = new FrameworkDetectorService();
    mockKeyFileScanner = new KeyFileScanner();
  });

  describe('Vue Detection', () => {
    it('should detect Vue 3 from package.json', async () => {
      const vueDetector = new VueDetector();
      const mockFiles = {
        packageJson: {
          dependencies: {
            vue: '^3.2.0'
          }
        },
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await vueDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'vue',
        type: 'frontend',
        version: '^3.2.0',
        confidence: 0.9,
        indicators: ['package.json: vue dependency']
      });
    });

    it('should detect Nuxt from config file', async () => {
      const vueDetector = new VueDetector();
      const mockFiles = {
        packageJson: undefined,
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: true,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await vueDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'nuxt',
        type: 'frontend',
        confidence: 0.95,
        indicators: ['nuxt.config.* exists']
      });
    });
  });

  describe('React Detection', () => {
    it('should detect React from package.json', async () => {
      const reactDetector = new ReactDetector();
      const mockFiles = {
        packageJson: {
          dependencies: {
            react: '^18.0.0'
          }
        },
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await reactDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'react',
        type: 'frontend',
        version: '^18.0.0',
        confidence: 0.9,
        indicators: ['package.json: react dependency']
      });
    });

    it('should detect Next.js from config file', async () => {
      const reactDetector = new ReactDetector();
      const mockFiles = {
        packageJson: {
          dependencies: {
            react: '^18.0.0',
            next: '^13.0.0'
          }
        },
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: true,
        fileExtensions: []
      };

      const result = await reactDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'nextjs',
        type: 'frontend',
        version: '^13.0.0',
        confidence: 0.95,
        indicators: ['next.config.js exists', 'package.json: react']
      });
    });
  });

  describe('Laravel Detection', () => {
    it('should detect Laravel from composer.json', async () => {
      const laravelDetector = new LaravelDetector();
      const mockFiles = {
        packageJson: undefined,
        composerJson: {
          require: {
            'laravel/framework': '^10.0'
          }
        },
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await laravelDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'laravel',
        type: 'backend',
        version: '^10.0',
        confidence: 0.95,
        indicators: ['composer.json: laravel/framework']
      });
    });

    it('should detect Express from package.json', async () => {
      const laravelDetector = new LaravelDetector();
      const mockFiles = {
        packageJson: {
          dependencies: {
            express: '^4.18.0'
          }
        },
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await laravelDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'express',
        type: 'backend',
        version: '^4.18.0',
        confidence: 0.85,
        indicators: ['package.json: express']
      });
    });
  });

  describe('TypeScript Detection', () => {
    it('should detect TypeScript from tsconfig.json', async () => {
      const tsDetector = new TypeScriptDetector();
      const mockFiles = {
        packageJson: undefined,
        composerJson: undefined,
        tsConfig: true,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await tsDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'typescript',
        type: 'language',
        confidence: 0.95,
        indicators: ['tsconfig.json exists']
      });
    });

    it('should detect Jest from package.json', async () => {
      const tsDetector = new TypeScriptDetector();
      const mockFiles = {
        packageJson: {
          devDependencies: {
            jest: '^29.0.0'
          }
        },
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: []
      };

      const result = await tsDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'jest',
        type: 'testing',
        confidence: 0.9,
        indicators: ['package.json: jest']
      });
    });

    it('should detect PHP from file extensions', async () => {
      const tsDetector = new TypeScriptDetector();
      const mockFiles = {
        packageJson: undefined,
        composerJson: undefined,
        tsConfig: false,
        viteConfig: false,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: false,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: ['php', 'js']
      };

      const result = await tsDetector.detect(mockFiles);
      
      expect(result).toEqual({
        name: 'php',
        type: 'language',
        confidence: 0.9,
        indicators: ['.php files or composer.json']
      });
    });
  });

  describe('Integration Tests', () => {
    it('should detect multiple frameworks correctly', async () => {
      const mockFiles = {
        packageJson: {
          dependencies: {
            vue: '^3.2.0',
            react: '^18.0.0'
          },
          devDependencies: {
            typescript: '^4.9.0',
            jest: '^29.0.0'
          }
        },
        composerJson: {
          require: {
            'laravel/framework': '^10.0'
          }
        },
        tsConfig: true,
        viteConfig: true,
        webpackConfig: false,
        jestConfig: false,
        phpUnitXml: false,
        hasArtisan: true,
        hasNuxtConfig: false,
        hasNextConfig: false,
        fileExtensions: ['vue', 'js', 'ts', 'php']
      };

      // Тестируем детекторы по отдельности
      const vueDetector = new VueDetector();
      const reactDetector = new ReactDetector();
      const laravelDetector = new LaravelDetector();
      const tsDetector = new TypeScriptDetector();

      const vueResult = await vueDetector.detect(mockFiles);
      const reactResult = await reactDetector.detect(mockFiles);
      const laravelResult = await laravelDetector.detect(mockFiles);
      const tsResult = await tsDetector.detect(mockFiles);

      expect(vueResult).toBeTruthy();
      expect(reactResult).toBeTruthy();
      expect(laravelResult).toBeTruthy();
      expect(tsResult).toBeTruthy();

      expect(vueResult?.name).toBe('vue');
      expect(reactResult?.name).toBe('react');
      expect(laravelResult?.name).toBe('laravel');
      expect(tsResult?.name).toBe('typescript');
    });
  });
});