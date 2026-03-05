/**
 * Style and Structure Detector Neurons Test
 */

import {describe, it, expect} from 'vitest';
import {
    detectStyles,
    addStyleMetadata,
    detectStructures,
    addStructureMetadata,
    detectPatterns,
    addPatternMetadata,
    getPatternSuggestions
} from '../style-detector.neuron.js';
import {
    detectStructures as detectStructuresImpl,
    addStructureMetadata as addStructureMetadataImpl
} from '../structure-detector.neuron.js';
import {
    detectPatterns as detectPatternsImpl,
    addPatternMetadata as addPatternMetadataImpl,
    getPatternSuggestions as getPatternSuggestionsImpl
} from '../pattern-detector.neuron.js';

describe('Style Detector Neuron', () => {
    it('should detect formal writing style', () => {
        const text = 'This document shall provide guidelines for the implementation of the system. Furthermore, it should be noted that all requirements must be met.';
        const result = detectStyles(text);

        expect(result).toHaveProperty('style_formal');
        expect(result.style_formal.confidence).toBeGreaterThan(0.3);
        expect(result.style_formal.indicators).toContain('shall');
        expect(result.style_formal.indicators).toContain('furthermore');
    });

    it('should detect technical writing style', () => {
        const text = 'The implementation of this architecture requires careful consideration of the component interfaces and module dependencies.';
        const result = detectStyles(text);

        expect(result).toHaveProperty('style_technical');
        expect(result.style_technical.confidence).toBeGreaterThan(0.3);
        expect(result.style_technical.indicators).toContain('implementation');
        expect(result.style_technical.indicators).toContain('architecture');
    });

    it('should add style metadata to data', () => {
        const data = {
            title: 'System Architecture Document',
            content: 'This document shall provide guidelines for the implementation of the system.'
        };

        const result = addStyleMetadata(data);

        expect(result).toHaveProperty('_style_metadata_content');
        expect(result._style_metadata_content).toHaveProperty('style_formal');
        expect(result._style_metadata_content.style_formal.confidence).toBeGreaterThan(0.3);
    });

    it('should handle empty or short text', () => {
        const result1 = detectStyles('');
        const result2 = detectStyles('Hi');

        expect(result1).toEqual({});
        expect(result2).toEqual({});
    });
});

describe('Structure Detector Neuron', () => {
    it('should detect markdown structure', () => {
        const text = '# Main Title\n## Subtitle\n- List item 1\n- List item 2\n```javascript\nconsole.log("test");\n```';
        const result = detectStructuresImpl(text);

        expect(result).toHaveProperty('structure_markdown_document');
        expect(result.structure_markdown_document.confidence).toBeGreaterThan(0.4);
        expect(result.structure_markdown_document.elements).toContain('headings');
        expect(result.structure_markdown_document.elements).toContain('lists');
        expect(result.structure_markdown_document.hierarchy.h1).toBe(1);
        expect(result.structure_markdown_document.hierarchy.h2).toBe(1);
    });

    it('should detect JSON structure', () => {
        const text = '{\n  "name": "test",\n  "value": 123,\n  "items": ["a", "b", "c"]\n}';
        const result = detectStructuresImpl(text);

        expect(result).toHaveProperty('structure_json_structure');
        expect(result.structure_json_structure.confidence).toBeGreaterThan(0.4);
        expect(result.structure_json_structure.elements).toContain('objects');
        expect(result.structure_json_structure.elements).toContain('arrays');
    });

    it('should detect code file structure', () => {
        const text = 'function calculateTotal(items) {\n  const sum = items.reduce((acc, item) => acc + item, 0);\n  return sum;\n}';
        const result = detectStructuresImpl(text);

        expect(result).toHaveProperty('structure_code_file');
        expect(result.structure_code_file.confidence).toBeGreaterThan(0.4);
        expect(result.structure_code_file.elements).toContain('functions');
    });

    it('should add structure metadata to data', () => {
        const data = {
            document: '# Title\n## Subtitle\n- Item 1\n- Item 2'
        };

        const result = addStructureMetadataImpl(data);

        expect(result).toHaveProperty('_structure_metadata_document');
        expect(result._structure_metadata_document).toHaveProperty('structure_markdown_document');
        expect(result._structure_metadata_document.structure_markdown_document.confidence).toBeGreaterThan(0.4);
    });
});

describe('Pattern Detector Neuron', () => {
    it('should detect naming conventions', () => {
        const text = 'const userName = "John";\nconst userAge = 25;\nfunction calculateTotal() {}\nclass UserManager {}';
        const result = detectPatternsImpl(text);

        expect(result).toHaveProperty('pattern_naming_conventions_camelCase');
        expect(result.pattern_naming_conventions_camelCase.confidence).toBeGreaterThan(0.2);
        expect(result.pattern_naming_conventions_camelCase.matches).toContain('userName');
        expect(result.pattern_naming_conventions_camelCase.matches).toContain('calculateTotal');
    });

    it('should detect code smells', () => {
        const text = 'const veryLongVariableNameThatExceedsTheRecommendedLengthLimit = "test";\nconsole.log("debug info");\nconst magicNumber = 42;';
        const result = detectPatternsImpl(text);

        expect(result).toHaveProperty('pattern_code_smells_long_lines');
        expect(result).toHaveProperty('pattern_code_smells_console_logs');
        expect(result).toHaveProperty('pattern_code_smells_magic_numbers');
    });

    it('should detect security patterns', () => {
        const text = 'const apiKey = "secret123456789";\nconst password = "mypassword";\nconst query = "SELECT * FROM users WHERE id = " + userId;';
        const result = detectPatternsImpl(text);

        expect(result).toHaveProperty('pattern_security_patterns_hardcoded_secrets');
        expect(result).toHaveProperty('pattern_security_patterns_sql_injection');
    });

    it('should add pattern metadata to data', () => {
        const data = {
            code: 'const userName = "John";\nconsole.log("debug");'
        };

        const result = addPatternMetadataImpl(data);

        expect(result).toHaveProperty('_pattern_metadata_code');
        expect(result._pattern_metadata_code).toHaveProperty('pattern_naming_conventions_camelCase');
        expect(result._pattern_metadata_code).toHaveProperty('pattern_code_smells_console_logs');
    });

    it('should provide pattern suggestions', () => {
        const text = 'const password = "secret123";\nconsole.log("debug info");';
        const suggestions = getPatternSuggestionsImpl(text);

        expect(suggestions).toHaveLength(2);
        expect(suggestions[0].type).toBe('security');
        expect(suggestions[0].severity).toBe('error');
        expect(suggestions[1].type).toBe('code_smell');
        expect(suggestions[1].severity).toBe('warning');
    });
});

describe('Integration Tests', () => {
    it('should process complex document with all detectors', () => {
        const complexData = {
            title: 'System Architecture Document',
            content: '# System Architecture\n\nThis document shall provide guidelines for the implementation of the system. The architecture requires careful consideration of component interfaces.\n\n```javascript\nfunction calculateTotal(items) {\n  const sum = items.reduce((acc, item) => acc + item, 0);\n  return sum;\n}\n\nconsole.log("debug info");\n```\n\n- Component A\n- Component B\n- Component C',
            metadata: {
                author: 'Developer',
                version: '1.0.0'
            }
        };

        // Apply all detectors
        const styleResult = addStyleMetadata(complexData);
        const structureResult = addStructureMetadata(styleResult);
        const patternResult = addPatternMetadata(structureResult);

        // Check style detection
        expect(patternResult).toHaveProperty('_style_metadata_content');
        expect(patternResult._style_metadata_content).toHaveProperty('style_formal');
        expect(patternResult._style_metadata_content).toHaveProperty('style_technical');

        // Check structure detection
        expect(patternResult).toHaveProperty('_structure_metadata_content');
        expect(patternResult._structure_metadata_content).toHaveProperty('structure_markdown_document');
        expect(patternResult._structure_metadata_content).toHaveProperty('structure_code_file');

        // Check pattern detection
        expect(patternResult).toHaveProperty('_pattern_metadata_content');
        expect(patternResult._pattern_metadata_content).toHaveProperty('pattern_naming_conventions_camelCase');
        expect(patternResult._pattern_metadata_content).toHaveProperty('pattern_code_smells_console_logs');
    });
});