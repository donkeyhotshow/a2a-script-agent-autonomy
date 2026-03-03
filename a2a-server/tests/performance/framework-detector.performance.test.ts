/**
 * Framework Detector Performance Tests
 */

import {describe, it, expect} from 'vitest';
import {FrameworkDetectorService} from '../../src/services/framework-detector.service.js';

describe('Framework Detector Performance', () => {
    const detector = new FrameworkDetectorService();

    // Large codebase simulation
    const largeCodebase = Array.from({length: 100}, (_, i) => ({
        path: `src/components/Component${i}.vue`,
        content: `
<template>
  <div class="component-${i}">
    <h1>Component ${i}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<style scoped>
.component-${i} {
  padding: 20px;
}
</style>
        `,
    }));

    // Add package.json and composer.json
    largeCodebase.push({
        path: 'package.json',
        content: JSON.stringify({
            name: 'test-project',
            version: '1.0.0',
            dependencies: {
                vue: '^3.5.0',
                'vue-router': '^4.0.0',
                pinia: '^2.0.0',
                tailwindcss: '^3.4.0',
                'vite-plugin-vue-devtools': '^7.0.0',
            },
            devDependencies: {
                vitest: '^4.0.0',
                '@vue/test-utils': '^2.0.0',
                '@playwright/test': '^1.58.0',
            },
        }),
    });

    largeCodebase.push({
        path: 'composer.json',
        content: JSON.stringify({
            name: 'test/laravel-app',
            type: 'project',
            require: {
                'php': '^8.2',
                'laravel/framework': '^11.0',
                'inertiajs/inertia-laravel': '^1.0',
            },
            require_dev: {
                'phpunit/phpunit': '^11.0',
                'pestphp/pest': '^3.0',
            },
        }),
    });

    it('should handle large codebase efficiently', async () => {
        const start = performance.now();
        
        const result = await detector.extractFrameworks(largeCodebase);
        
        const end = performance.now();
        const duration = end - start;

        console.log(`Framework detection took ${duration.toFixed(2)}ms for ${largeCodebase.length} files`);

        // Should complete in reasonable time (less than 1 second)
        expect(duration).toBeLessThan(1000);
        
        // Should detect frameworks correctly
        expect(result.frontend).toContain('vue@3.5.0');
        expect(result.backend).toContain('laravel@11.0');
        expect(result.testing).toContain('vitest@4.0.0');
    });

    it('should handle concurrent requests', async () => {
        const start = performance.now();
        
        // Run multiple detections concurrently
        const promises = Array.from({length: 5}, () => 
            detector.extractFrameworks(largeCodebase)
        );

        const results = await Promise.all(promises);
        
        const end = performance.now();
        const duration = end - start;

        console.log(`Concurrent detection took ${duration.toFixed(2)}ms for 5 requests`);

        // Should complete reasonably fast
        expect(duration).toBeLessThan(2000);
        
        // All results should be identical
        const firstResult = results[0];
        results.forEach(result => {
            expect(result.frontend).toEqual(firstResult.frontend);
            expect(result.backend).toEqual(firstResult.backend);
            expect(result.testing).toEqual(firstResult.testing);
        });
    });

    it('should handle empty codebase', async () => {
        const start = performance.now();
        
        const result = await detector.extractFrameworks([]);
        
        const end = performance.now();
        const duration = end - start;

        console.log(`Empty codebase detection took ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(100);
        expect(result.frontend).toEqual([]);
        expect(result.backend).toEqual([]);
        expect(result.testing).toEqual([]);
    });

    it('should handle malformed files gracefully', async () => {
        const malformedCodebase = [
            {
                path: 'package.json',
                content: '{ invalid json',
            },
            {
                path: 'composer.json',
                content: 'not json at all',
            },
            {
                path: 'src/App.vue',
                content: '<template><div>App</div></template>',
            },
        ];

        const start = performance.now();
        
        const result = await detector.extractFrameworks(malformedCodebase);
        
        const end = performance.now();
        const duration = end - start;

        console.log(`Malformed files detection took ${duration.toFixed(2)}ms`);

        expect(duration).toBeLessThan(500);
        // Should still work despite malformed files
        expect(Array.isArray(result.frontend)).toBe(true);
        expect(Array.isArray(result.backend)).toBe(true);
    });
});