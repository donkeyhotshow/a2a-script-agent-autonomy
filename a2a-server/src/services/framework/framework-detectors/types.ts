/**
 * Интерфейс для детектора фреймворка
 */
export interface FrameworkDetector {
  name: string;
  detect(files: KeyFileInfo): Promise<DetectionResult | null>;
}

/**
 * Результат детектирования одного фреймворка
 */
export interface DetectionResult {
  name: string;
  type: 'frontend' | 'backend' | 'testing' | 'build' | 'language';
  version?: string;
  confidence: number;  // 0-1
  indicators: string[];  // Что указало на этот фреймворк
}

/**
 * Полный результат детектирования фреймворков
 */
export interface FrameworkDetectionResult {
  frameworks: DetectedFramework[];
  primary: {
    frontend?: DetectedFramework;
    backend?: DetectedFramework;
  };
  languages: string[];
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'composer';
}

/**
 * Детектированный фреймворк (то же что и DetectionResult, но для удобства)
 */
export interface DetectedFramework extends DetectionResult {}

/**
 * Информация о ключевых файлах в проекте
 */
export interface KeyFileInfo {
  // Package files
  packageJson?: PackageJson;
  composerJson?: ComposerJson;
  
  // Config files (exists: boolean or content)
  tsConfig?: boolean;
  viteConfig?: boolean;
  webpackConfig?: boolean;
  jestConfig?: boolean;
  phpUnitXml?: boolean;
  
  // Special files
  hasArtisan: boolean;
  hasNuxtConfig: boolean;
  hasNextConfig: boolean;
  
  // Detected from file list
  fileExtensions: string[];
}

/**
 * Package.json структура
 */
export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

/**
 * Composer.json структура
 */
export interface ComposerJson {
  name?: string;
  description?: string;
  type?: string;
  require?: Record<string, string>;
  requireDev?: Record<string, string>;
  suggest?: Record<string, string>;
    autoload?: {
      'psr-4'?: Record<string, string>;
      classmap?: string[];
    };
}