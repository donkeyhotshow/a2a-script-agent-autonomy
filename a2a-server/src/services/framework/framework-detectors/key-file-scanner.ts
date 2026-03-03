import { KeyFileInfo, PackageJson, ComposerJson } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Сканер ключевых файлов для детектирования фреймворков
 */
export class KeyFileScanner {
  private readonly keyFiles = [
    'package.json',
    'composer.json',
    'tsconfig.json',
    'vite.config.ts',
    'vite.config.js',
    'nuxt.config.ts',
    'nuxt.config.js',
    'next.config.js',
    'angular.json',
    'nest-cli.json',
    'artisan',
    'phpunit.xml',
    'phpunit.xml.dist',
    'jest.config.js',
    'jest.config.ts',
    'webpack.config.js',
    'webpack.config.ts',
  ];

  /**
   * Сканирование из списка файлов (для нейронов)
   */
  async scanFromFiles(files: string[]): Promise<KeyFileInfo> {
    const keyFiles: KeyFileInfo = {
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
      fileExtensions: [],
    };

    for (const filePath of files) {
      const fileName = path.basename(filePath).toLowerCase();
      const ext = path.extname(filePath).toLowerCase();

      // Package files
      if (fileName === 'package.json') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          keyFiles.packageJson = JSON.parse(content);
        } catch (error) {
          console.warn(`Failed to read package.json: ${filePath}`);
        }
      } else if (fileName === 'composer.json') {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          keyFiles.composerJson = JSON.parse(content);
        } catch (error) {
          console.warn(`Failed to read composer.json: ${filePath}`);
        }
      }

      // Config files
      if (fileName.includes('tsconfig')) keyFiles.tsConfig = true;
      if (fileName.includes('vite.config')) keyFiles.viteConfig = true;
      if (fileName.includes('webpack.config')) keyFiles.webpackConfig = true;
      if (fileName.includes('jest.config')) keyFiles.jestConfig = true;
      if (fileName.includes('phpunit.xml')) keyFiles.phpUnitXml = true;
      if (fileName === 'artisan') keyFiles.hasArtisan = true;
      if (fileName.includes('nuxt.config')) keyFiles.hasNuxtConfig = true;
      if (fileName.includes('next.config')) keyFiles.hasNextConfig = true;

      // File extensions
      if (ext && !keyFiles.fileExtensions.includes(ext)) {
        keyFiles.fileExtensions.push(ext);
      }
    }

    return keyFiles;
  }

  /**
   * Сканирование из codeBlocks (для совместимости с extractFrameworks)
   */
  async scanFromCodeBlocks(codeBlocks: Array<{ path: string; content: string }>): Promise<KeyFileInfo> {
    const keyFiles: KeyFileInfo = {
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
      fileExtensions: [],
    };

    for (const block of codeBlocks) {
      const fileName = path.basename(block.path).toLowerCase();
      const ext = path.extname(block.path).toLowerCase();

      // Package files
      if (fileName === 'package.json') {
        try {
          keyFiles.packageJson = JSON.parse(block.content);
        } catch (error) {
          console.warn(`Failed to parse package.json: ${block.path}`);
        }
      } else if (fileName === 'composer.json') {
        try {
          keyFiles.composerJson = JSON.parse(block.content);
        } catch (error) {
          console.warn(`Failed to parse composer.json: ${block.path}`);
        }
      }

      // Config files (просто проверяем наличие)
      if (fileName.includes('tsconfig')) keyFiles.tsConfig = true;
      if (fileName.includes('vite.config')) keyFiles.viteConfig = true;
      if (fileName.includes('webpack.config')) keyFiles.webpackConfig = true;
      if (fileName.includes('jest.config')) keyFiles.jestConfig = true;
      if (fileName.includes('phpunit.xml')) keyFiles.phpUnitXml = true;
      if (fileName === 'artisan') keyFiles.hasArtisan = true;
      if (fileName.includes('nuxt.config')) keyFiles.hasNuxtConfig = true;
      if (fileName.includes('next.config')) keyFiles.hasNextConfig = true;

      // File extensions
      if (ext && !keyFiles.fileExtensions.includes(ext)) {
        keyFiles.fileExtensions.push(ext);
      }
    }

    return keyFiles;
  }
}
