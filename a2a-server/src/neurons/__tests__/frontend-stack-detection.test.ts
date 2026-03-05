/**
 * Frontend Stack Detection Neurons Test Suite
 */

import {describe, it, expect} from 'vitest';
import {
    detectFrontendStacks,
    addFrontendStackMetadata,
    frontendStackDetectorNeuron
} from '../frontend-stack-detector.neuron.js';

describe('Frontend Stack Detector Neuron', () => {
    describe('detectFrontendStacks', () => {
        it('should detect Vue.js with Tailwind CSS stack', () => {
            const text = 'Using Vue.js with v-if directives and Tailwind CSS with tw- utility classes.';
            const result = detectFrontendStacks(text);
            
            expect(result).toHaveProperty('frontend_stack_vue-tailwind');
            expect(result.frontend_stack_vue-tailwind.stack).toBe('vue-tailwind');
            expect(result.frontend_stack_vue-tailwind.confidence).toBeGreaterThan(0);
            expect(result.frontend_stack_vue-tailwind.frameworks).toContain('vue');
            expect(result.frontend_stack_vue-tailwind.frameworks).toContain('tailwind');
        });

        it('should detect Inertia.js with Vue.js stack', () => {
            const text = 'Using Inertia.js to connect Laravel backend with Vue.js frontend using usePage hook.';
            const result = detectFrontendStacks(text);
            
            expect(result).toHaveProperty('frontend_stack_inertia-vue');
            expect(result.frontend_stack_inertia-vue.stack).toBe('inertia-vue');
            expect(result.frontend_stack_inertia-vue.confidence).toBeGreaterThan(0);
            expect(result.frontend_stack_inertia-vue.frameworks).toContain('inertia');
            expect(result.frontend_stack_inertia-vue.frameworks).toContain('vue');
        });

        it('should detect Laravel with Inertia.js backend stack', () => {
            const text = 'Laravel backend with Inertia.js rendering and Inertia::render method.';
            const result = detectFrontendStacks(text);
            
            expect(result).toHaveProperty('frontend_stack_laravel-inertia');
            expect(result.frontend_stack_laravel-inertia.stack).toBe('laravel-inertia');
            expect(result.frontend_stack_laravel-inertia.confidence).toBeGreaterThan(0);
            expect(result.frontend_stack_laravel-inertia.frameworks).toContain('laravel');
            expect(result.frontend_stack_laravel-inertia.frameworks).toContain('inertia');
        });

        it('should detect testing stack with Vitest and Playwright', () => {
            const text = 'Using Vitest for unit testing and Playwright for E2E testing with test.describe blocks.';
            const result = detectFrontendStacks(text);
            
            expect(result).toHaveProperty('frontend_stack_testing-stack');
            expect(result.frontend_stack_testing-stack.stack).toBe('testing-stack');
            expect(result.frontend_stack_testing-stack.confidence).toBeGreaterThan(0);
            expect(result.frontend_stack_testing-stack.frameworks).toContain('vitest');
            expect(result.frontend_stack_testing-stack.frameworks).toContain('playwright');
        });

        it('should handle case insensitive detection', () => {
            const text = 'VUE.JS with TAILWIND CSS and INERTIA.JS integration.';
            const result = detectFrontendStacks(text);
            
            expect(result).toHaveProperty('frontend_stack_vue-tailwind');
            expect(result).toHaveProperty('frontend_stack_inertia-vue');
        });

        it('should return empty result for text without stack patterns', () => {
            const text = 'This is a plain text without any frontend stack mentions.';
            const result = detectFrontendStacks(text);
            
            expect(Object.keys(result)).toHaveLength(0);
        });

        it('should handle object input', () => {
            const obj = {
                description: 'Vue.js with Tailwind CSS stack',
                config: {framework: 'vue', css: 'tailwind'}
            };
            const result = detectFrontendStacks(obj);
            
            expect(result).toHaveProperty('frontend_stack_vue-tailwind');
        });

        it('should detect combination patterns', () => {
            const text = 'Full stack with Laravel, Inertia.js, Vue.js, and Tailwind CSS.';
            const result = detectFrontendStacks(text);
            
            expect(result.frontend_stack_laravel-inertia.combination).toBe(true);
            expect(result.frontend_stack_vue-tailwind.combination).toBe(true);
        });
    });

    describe('addFrontendStackMetadata', () => {
        it('should add frontend stack metadata to string fields', () => {
            const data = {
                description: 'Vue.js with Tailwind CSS and Inertia.js integration',
                config: 'Some configuration text'
            };
            
            const result = addFrontendStackMetadata(data);
            
            expect(result).toHaveProperty('_frontend_stack_metadata_description');
            expect(result._frontend_stack_metadata_description).toHaveProperty('frontend_stack_vue-tailwind');
            expect(result._frontend_stack_metadata_description).toHaveProperty('frontend_stack_inertia-vue');
        });

        it('should not add metadata for short text fields', () => {
            const data = {
                short: 'Vue',
                long: 'Vue.js with Tailwind CSS'
            };
            
            const result = addFrontendStackMetadata(data);
            
            expect(result).not.toHaveProperty('_frontend_stack_metadata_short');
            expect(result).toHaveProperty('_frontend_stack_metadata_long');
        });

        it('should handle nested objects', () => {
            const data = {
                project: {
                    description: 'Laravel with Inertia.js and Vue.js frontend',
                    config: {
                        framework: 'laravel'
                    }
                }
            };
            
            const result = addFrontendStackMetadata(data);
            
            expect(result).toHaveProperty('_frontend_stack_metadata_project.description');
            expect(result._frontend_stack_metadata_project.description).toHaveProperty('frontend_stack_laravel-inertia');
            expect(result._frontend_stack_metadata_project.description).toHaveProperty('frontend_stack_inertia-vue');
        });

        it('should handle arrays', () => {
            const data = {
                files: [
                    'Vue.js with Tailwind CSS',
                    'Inertia.js integration',
                    'Short'
                ]
            };
            
            const result = addFrontendStackMetadata(data);
            
            expect(result).toHaveProperty('_frontend_stack_metadata_files[0]');
            expect(result).toHaveProperty('_frontend_stack_metadata_files[1]');
            expect(result).not.toHaveProperty('_frontend_stack_metadata_files[2]');
        });
    });

    describe('neuron configuration', () => {
        it('should have correct neuron properties', () => {
            expect(frontendStackDetectorNeuron.id).toBe('neuron-frontend-stack-detector');
            expect(frontendStackDetectorNeuron.name).toBe('Frontend Stack Detector');
            expect(frontendStackDetectorNeuron.category).toBe('custom_lint');
            expect(frontendStackDetectorNeuron.triggers).toEqual(['*']);
            expect(frontendStackDetectorNeuron.priority).toBe(7);
        });

        it('should have all required stack patterns', () => {
            const patterns = frontendStackDetectorNeuron.knowledge.stackPatterns as Record<string, any>;
            
            expect(patterns).toHaveProperty('vue-tailwind');
            expect(patterns).toHaveProperty('inertia-vue');
            expect(patterns).toHaveProperty('laravel-inertia');
            expect(patterns).toHaveProperty('testing-stack');
        });

        it('should have correct frameworks for each stack', () => {
            const patterns = frontendStackDetectorNeuron.knowledge.stackPatterns as Record<string, any>;
            
            expect(patterns['vue-tailwind'].frameworks).toContain('vue');
            expect(patterns['vue-tailwind'].frameworks).toContain('tailwind');
            expect(patterns['inertia-vue'].frameworks).toContain('inertia');
            expect(patterns['inertia-vue'].frameworks).toContain('vue');
            expect(patterns['laravel-inertia'].frameworks).toContain('laravel');
            expect(patterns['laravel-inertia'].frameworks).toContain('inertia');
            expect(patterns['testing-stack'].frameworks).toContain('vitest');
            expect(patterns['testing-stack'].frameworks).toContain('playwright');
        });

        it('should have correct indicators for each stack', () => {
            const patterns = frontendStackDetectorNeuron.knowledge.stackPatterns as Record<string, any>;
            
            expect(patterns['vue-tailwind'].indicators).toContain('v-if');
            expect(patterns['vue-tailwind'].indicators).toContain('tw-');
            expect(patterns['inertia-vue'].indicators).toContain('usePage');
            expect(patterns['inertia-vue'].indicators).toContain('Inertia');
            expect(patterns['laravel-inertia'].indicators).toContain('Inertia::render');
            expect(patterns['testing-stack'].indicators).toContain('test.describe');
            expect(patterns['testing-stack'].indicators).toContain('page.goto');
        });
    });
});