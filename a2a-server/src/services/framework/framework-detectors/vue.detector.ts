import { FrameworkDetector, DetectionResult, KeyFileInfo } from './types';

/**
 * Детектор Vue.js фреймворков (Vue 2, Vue 3, Nuxt)
 */
export class VueDetector implements FrameworkDetector {
  name = 'vue';

  async detect(files: KeyFileInfo): Promise<DetectionResult | null> {
    // Проверка package.json на наличие Vue
    if (files.packageJson?.dependencies?.vue) {
      const vueVersion = files.packageJson.dependencies.vue;
      const isVue3 = this.isVue3(vueVersion);
      
      return {
        name: isVue3 ? 'vue' : 'vue2',
        type: 'frontend',
        version: vueVersion,
        confidence: 0.9,
        indicators: ['package.json: vue dependency']
      };
    }

    // Проверка на Nuxt.js
    if (files.hasNuxtConfig) {
      return {
        name: 'nuxt',
        type: 'frontend',
        confidence: 0.95,
        indicators: ['nuxt.config.* exists']
      };
    }

    // Проверка на Vite + Vue (если есть vite config и vue в зависимостях)
    if (files.viteConfig && files.packageJson?.dependencies?.vue) {
      return {
        name: 'vue',
        type: 'frontend',
        confidence: 0.95,
        indicators: ['vite.config.*', 'package.json: vue']
      };
    }

    return null;
  }

  /**
   * Определение версии Vue
   */
  private isVue3(version: string): boolean {
    if (!version) return false;
    
    // Удаляем символы версии (^, ~, >= и т.д.)
    const cleanVersion = version.replace(/[^\d.]/g, '');
    const [major] = cleanVersion.split('.').map(Number);
    
    return major >= 3;
  }
}