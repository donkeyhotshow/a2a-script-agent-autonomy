import { KeyFileScanner } from './framework-detectors/key-file-scanner';
import { FrameworkDetector, DetectedFramework, FrameworkDetectionResult, KeyFileInfo } from './framework-detectors/types';
import { VueDetector } from './framework-detectors/vue.detector';
import { ReactDetector } from './framework-detectors/react.detector';
import { LaravelDetector } from './framework-detectors/laravel.detector';
import { TypeScriptDetector } from './framework-detectors/typescript.detector';

/**
 * Упрощенный сервис для детектирования фреймворков в проекте.
 * Заменяет framework-extractor.service.ts с ~9000 строк на ~500 строк.
 */
export class FrameworkDetectorService {
  private readonly detectors: FrameworkDetector[];
  private readonly keyFileScanner: KeyFileScanner;

  constructor() {
    this.detectors = [
      new VueDetector(),
      new ReactDetector(),
      new LaravelDetector(),
      new TypeScriptDetector(),
    ];
    this.keyFileScanner = new KeyFileScanner();
  }

  /**
   * Детектирование фреймворков по пути к проекту
   */
  async detect(projectPath: string): Promise<FrameworkDetectionResult> {
    try {
      const keyFiles = await this.keyFileScanner.scan(projectPath);
      return await this.detectFromKeyFiles(keyFiles);
    } catch (error) {
      console.error('Framework detection failed:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Детектирование фреймворков из списка файлов (для использования в нейронах)
   */
  async detectFromFiles(files: string[]): Promise<FrameworkDetectionResult> {
    try {
      const keyFiles = await this.keyFileScanner.scanFromFiles(files);
      return await this.detectFromKeyFiles(keyFiles);
    } catch (error) {
      console.error('Framework detection from files failed:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Детектирование фреймворков из ключевой информации о файлах
   */
  private async detectFromKeyFiles(keyFiles: KeyFileInfo): Promise<FrameworkDetectionResult> {
    const detections: DetectedFramework[] = [];

    // Запускаем все детекторы
    for (const detector of this.detectors) {
      try {
        const result = await detector.detect(keyFiles);
        if (result) {
          detections.push(result);
        }
      } catch (error) {
        console.error(`Detector ${detector.name} failed:`, error);
      }
    }

    // Определяем package manager
    const packageManager = this.detectPackageManager(keyFiles);

    // Агрегируем результаты
    return this.aggregateResults(detections, packageManager);
  }

  /**
   * Определение package manager
   */
  private detectPackageManager(keyFiles: KeyFileInfo): 'npm' | 'yarn' | 'pnpm' | 'composer' | undefined {
    if (keyFiles.composerJson) return 'composer';
    if (keyFiles.packageJson) {
      // Проверяем наличие yarn.lock или pnpm-lock.yaml
      // В реальной реализации нужно проверять наличие lock файлов
      return 'npm';
    }
    return undefined;
  }

  /**
   * Агрегация результатов детектирования
   */
  private aggregateResults(
    detections: DetectedFramework[],
    packageManager?: 'npm' | 'yarn' | 'pnpm' | 'composer'
  ): FrameworkDetectionResult {
    const primary: FrameworkDetectionResult['primary'] = {};
    const languages: string[] = [];

    // Сортируем по confidence (уверенности)
    detections.sort((a, b) => b.confidence - a.confidence);

    // Определяем primary frameworks
    for (const detection of detections) {
      if (detection.type === 'frontend' && !primary.frontend) {
        primary.frontend = detection;
      } else if (detection.type === 'backend' && !primary.backend) {
        primary.backend = detection;
      } else if (detection.type === 'language') {
        languages.push(detection.name);
      }
    }

    return {
      frameworks: detections,
      primary,
      languages,
      packageManager
    };
  }

  /**
   * Создание пустого результата при ошибке
   */
  private createEmptyResult(): FrameworkDetectionResult {
    return {
      frameworks: [],
      primary: {},
      languages: [],
      packageManager: undefined
    };
  }

  /**
   * Извлечение фреймворков из codeBlocks (совместимость с extractFrameworks)
   */
  async extractFrameworks(codeBlocks: Array<{ path: string; content: string }>): Promise<{
    frontend: string[];
    backend: string[];
    testing: string[];
    libraries: { js: string[]; php: string[] };
    phpVersion?: string;
    nodeVersion?: string;
  }> {
    try {
      const keyFiles = await this.keyFileScanner.scanFromCodeBlocks(codeBlocks);
      const result = await this.detectFromKeyFiles(keyFiles);

      // Преобразуем результат в старый формат для совместимости
      const frontend: string[] = [];
      const backend: string[] = [];
      const testing: string[] = [];
      const libraries = { js: [], php: [] };

      for (const framework of result.frameworks) {
        const version = framework.version || 'unknown';
        const formatted = `${framework.name}@${version}`;

        switch (framework.type) {
          case 'frontend':
            frontend.push(formatted);
            break;
          case 'backend':
            backend.push(formatted);
            break;
          case 'testing':
            testing.push(formatted);
            break;
          case 'language':
            // Языки не включаем в старый формат
            break;
        }
      }

      return {
        frontend,
        backend,
        testing,
        libraries,
        phpVersion: result.frameworks.find(f => f.name === 'php')?.version,
        nodeVersion: result.frameworks.find(f => f.name === 'node')?.version,
      };
    } catch (error) {
      console.error('Framework extraction failed:', error);
      return {
        frontend: [],
        backend: [],
        testing: [],
        libraries: { js: [], php: [] },
      };
    }
  }
}

const frameworkDetectorService = new FrameworkDetectorService();

export async function extractFrameworks(codeBlocks: Array<{ path: string; content: string }>) {
  return frameworkDetectorService.extractFrameworks(codeBlocks);
}

export function hasInitialProjectFiles(codeBlocks: Array<{ path: string; content: string }>): boolean {
  return codeBlocks.some(block => {
    const fileName = block.path.split('/').pop()?.toLowerCase() || '';
    return fileName === 'package.json' || fileName === 'composer.json';
  });
}

type ExtractedFrameworks = {
  frontend: string[];
  backend: string[];
  testing: string[];
};

export function getFrameworkTriggers(frameworks: ExtractedFrameworks): string[] {
  const triggers: string[] = [];
  if (frameworks.frontend.some(f => f.includes('vue'))) {
    triggers.push('vue', 'vue3', 'vue-component');
  }
  if (frameworks.frontend.some(f => f.includes('inertia'))) {
    triggers.push('inertia', 'inertia-vue', 'inertia-props');
  }
  if (frameworks.backend.some(f => f.includes('laravel'))) {
    triggers.push('laravel', 'eloquent', 'blade');
  }
  if (frameworks.frontend.some(f => f.includes('tailwind'))) {
    triggers.push('tailwind', 'tailwind-classes');
  }
  if (frameworks.testing.some(t => t.includes('vitest'))) {
    triggers.push('vitest', 'unit-test');
  }
  if (frameworks.testing.some(t => t.includes('playwright'))) {
    triggers.push('playwright', 'e2e-test');
  }
  return triggers;
}
