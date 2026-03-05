/**
 * Technology Detection Neurons Test Suite
 */

import {describe, it, expect} from 'vitest';
import {
    detectTechnologies,
    addTechMetadata,
    techDetectorNeuron
} from '../tech-detector.neuron.js';

describe('Technology Detector Neuron', () => {
    describe('detectTechnologies', () => {
        it('should detect Laravel technology', () => {
            const text = 'This is a Laravel application with Eloquent models and Blade templates.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_laravel');
            expect(result.tech_laravel.technology).toBe('laravel');
            expect(result.tech_laravel.confidence).toBeGreaterThan(0);
            expect(result.tech_laravel.indicators).toContain('laravel');
        });

        it('should detect Vue.js technology', () => {
            const text = 'Using Vue.js with v-if directives and Vue Router for navigation.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_vue');
            expect(result.tech_vue.technology).toBe('vue');
            expect(result.tech_vue.confidence).toBeGreaterThan(0);
            expect(result.tech_vue.indicators).toContain('vue');
        });

        it('should detect Tailwind CSS technology', () => {
            const text = 'Styling with Tailwind CSS using utility classes like tw-text-center.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_tailwind');
            expect(result.tech_tailwind.technology).toBe('tailwind');
            expect(result.tech_tailwind.confidence).toBeGreaterThan(0);
            expect(result.tech_tailwind.indicators).toContain('tailwind');
        });

        it('should detect Inertia.js technology', () => {
            const text = 'Using Inertia.js to connect Laravel backend with Vue.js frontend.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_inertia');
            expect(result.tech_inertia.technology).toBe('inertia');
            expect(result.tech_inertia.confidence).toBeGreaterThan(0);
            expect(result.tech_inertia.indicators).toContain('inertia');
        });

        it('should detect Vitest testing framework', () => {
            const text = 'Using Vitest for testing with describe and it blocks.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_vitest');
            expect(result.tech_vitest.technology).toBe('vitest');
            expect(result.tech_vitest.confidence).toBeGreaterThan(0);
            expect(result.tech_vitest.indicators).toContain('vitest');
        });

        it('should detect Playwright testing framework', () => {
            const text = 'Using Playwright for E2E testing with page.goto and page.click.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_playwright');
            expect(result.tech_playwright.technology).toBe('playwright');
            expect(result.tech_playwright.confidence).toBeGreaterThan(0);
            expect(result.tech_playwright.indicators).toContain('playwright');
        });

        it('should handle case insensitive detection', () => {
            const text = 'LARAVEL application with VUE components and TAILWIND styling.';
            const result = detectTechnologies(text);
            
            expect(result).toHaveProperty('tech_laravel');
            expect(result).toHaveProperty('tech_vue');
            expect(result).toHaveProperty('tech_tailwind');
        });

        it('should return empty result for text without technologies', () => {
            const text = 'This is a plain text without any technology mentions.';
            const result = detectTechnologies(text);
            
            expect(Object.keys(result)).toHaveLength(0);
        });

        it('should handle object input', () => {
            const obj = {
                description: 'Laravel application with Vue.js frontend',
                config: {framework: 'laravel'}
            };
            const result = detectTechnologies(obj);
            
            expect(result).toHaveProperty('tech_laravel');
            expect(result).toHaveProperty('tech_vue');
        });
    });

    describe('addTechMetadata', () => {
        it('should add technology metadata to string fields', () => {
            const data = {
                description: 'Laravel application with Vue.js and Tailwind CSS',
                config: 'Some configuration text'
            };
            
            const result = addTechMetadata(data);
            
            expect(result).toHaveProperty('_tech_metadata_description');
            expect(result._tech_metadata_description).toHaveProperty('tech_laravel');
            expect(result._tech_metadata_description).toHaveProperty('tech_vue');
            expect(result._tech_metadata_description).toHaveProperty('tech_tailwind');
        });

        it('should not add metadata for short text fields', () => {
            const data = {
                short: 'Vue',
                long: 'Laravel application with Vue.js'
            };
            
            const result = addTechMetadata(data);
            
            expect(result).not.toHaveProperty('_tech_metadata_short');
            expect(result).toHaveProperty('_tech_metadata_long');
        });

        it('should handle nested objects', () => {
            const data = {
                project: {
                    description: 'Laravel with Inertia.js and Vue.js',
                    config: {
                        framework: 'laravel'
                    }
                }
            };
            
            const result = addTechMetadata(data);
            
            expect(result).toHaveProperty('_tech_metadata_project.description');
            expect(result._tech_metadata_project.description).toHaveProperty('tech_laravel');
            expect(result._tech_metadata_project.description).toHaveProperty('tech_inertia');
            expect(result._tech_metadata_project.description).toHaveProperty('tech_vue');
        });

        it('should handle arrays', () => {
            const data = {
                files: [
                    'Laravel application',
                    'Vue.js component',
                    'Short'
                ]
            };
            
            const result = addTechMetadata(data);
            
            expect(result).toHaveProperty('_tech_metadata_files[0]');
            expect(result).toHaveProperty('_tech_metadata_files[1]');
            expect(result).not.toHaveProperty('_tech_metadata_files[2]');
        });
    });

    describe('neuron configuration', () => {
        it('should have correct neuron properties', () => {
            expect(techDetectorNeuron.id).toBe('neuron-tech-detector');
            expect(techDetectorNeuron.name).toBe('Technology Detector');
            expect(techDetectorNeuron.category).toBe('custom_lint');
            expect(techDetectorNeuron.triggers).toEqual(['*']);
            expect(techDetectorNeuron.priority).toBe(6);
        });

        it('should have all required technology patterns', () => {
            const patterns = techDetectorNeuron.knowledge.techPatterns as Record<string, any>;
            
            expect(patterns).toHaveProperty('laravel');
            expect(patterns).toHaveProperty('vue');
            expect(patterns).toHaveProperty('tailwind');
            expect(patterns).toHaveProperty('inertia');
            expect(patterns).toHaveProperty('vitest');
            expect(patterns).toHaveProperty('playwright');
        });

        it('should have correct indicators for each technology', () => {
            const patterns = techDetectorNeuron.knowledge.techPatterns as Record<string, any>;
            
            expect(patterns.laravel.indicators).toContain('laravel');
            expect(patterns.laravel.indicators).toContain('eloquent');
            expect(patterns.vue.indicators).toContain('vue');
            expect(patterns.vue.indicators).toContain('v-if');
            expect(patterns.tailwind.indicators).toContain('tailwind');
            expect(patterns.tailwind.indicators).toContain('tw-');
        });
    });
});