#!/usr/bin/env npx tsx

/**
 * Simple test script for style and structure detection neurons
 * 
 * Run with: npx tsx test-neurons.js
 */

// ESM import syntax
import { detectStyles, addStyleMetadata } from './src/neurons/style-detector.neuron.js';
import { detectStructures, addStructureMetadata } from './src/neurons/structure-detector.neuron.js';
import { detectPatterns, addPatternMetadata, getPatternSuggestions } from './src/neurons/pattern-detector.neuron.js';

console.log('🧪 Testing Style and Structure Detection Neurons\n');

// Test 1: Style Detection
console.log('1. Testing Style Detection:');
const formalText = 'This document shall provide guidelines for the implementation of the system. Furthermore, it should be noted that all requirements must be met.';
const styleResult = detectStyles(formalText);
console.log('   Formal text styles:', Object.keys(styleResult));
console.log('   Confidence:', styleResult.style_formal?.confidence || 'N/A');

// Test 2: Structure Detection
console.log('\n2. Testing Structure Detection:');
const markdownText = '# Main Title\n## Subtitle\n- List item 1\n- List item 2\n```javascript\nconsole.log("test");\n```';
const structureResult = detectStructures(markdownText);
console.log('   Detected structures:', Object.keys(structureResult));
console.log('   Elements:', structureResult.structure_markdown_document?.elements || []);

// Test 3: Pattern Detection
console.log('\n3. Testing Pattern Detection:');
const codeText = 'const userName = "John";\nconsole.log("debug info");\nconst magicNumber = 42;';
const patternResult = detectPatterns(codeText);
console.log('   Detected patterns:', Object.keys(patternResult));
console.log('   Matches:', patternResult.pattern_naming_conventions_camelCase?.matches || []);

// Test 4: Metadata Addition
console.log('\n4. Testing Metadata Addition:');
const testData = {
    title: 'System Architecture Document',
    content: 'This document shall provide guidelines for the implementation of the system.'
};

const styleMetadataResult = addStyleMetadata(testData);
console.log('   Style metadata added:', Object.keys(styleMetadataResult).filter(key => key.startsWith('_style_metadata')));

const structureMetadataResult = addStructureMetadata(styleMetadataResult);
console.log('   Structure metadata added:', Object.keys(structureMetadataResult).filter(key => key.startsWith('_structure_metadata')));

const patternMetadataResult = addPatternMetadata(structureMetadataResult);
console.log('   Pattern metadata added:', Object.keys(patternMetadataResult).filter(key => key.startsWith('_pattern_metadata')));

// Test 5: Pattern Suggestions
console.log('\n5. Testing Pattern Suggestions:');
const securityText = 'const password = "secret123";\nconsole.log("debug info");';
const suggestions = getPatternSuggestions(securityText);
console.log('   Security suggestions:', suggestions.length);
suggestions.forEach((suggestion, index) => {
    console.log(`   ${index + 1}. ${suggestion.type}: ${suggestion.message} (${suggestion.severity})`);
});

console.log('\n✅ All tests completed successfully!');