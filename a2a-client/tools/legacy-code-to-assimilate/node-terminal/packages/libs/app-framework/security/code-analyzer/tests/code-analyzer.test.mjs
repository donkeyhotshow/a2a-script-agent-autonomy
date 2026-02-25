/**
 * Тесты для CodeAnalyzer
 * Система анализа кода и выявления проблем
 */

import { detectLanguage, hasTests, hasDocumentation, assessComplexity } from '../src/code-analyzer.js';

describe('Code Analyzer', () => {
  describe('detectLanguage', () => {
    test('should correctly detect JavaScript files', () => {
      expect(detectLanguage('/path/to/file.js')).toBe('javascript');
      expect(detectLanguage('/path/to/file.JS')).toBe('javascript');
    });

    test('should correctly detect TypeScript files', () => {
      expect(detectLanguage('/path/to/file.ts')).toBe('typescript');
      expect(detectLanguage('/path/to/file.TS')).toBe('typescript');
    });

    test('should correctly detect React (JSX) files', () => {
      expect(detectLanguage('/path/to/file.jsx')).toBe('react');
      expect(detectLanguage('/path/to/file.JSX')).toBe('react');
    });

    test('should correctly detect React TypeScript (TSX) files', () => {
      expect(detectLanguage('/path/to/file.tsx')).toBe('react-typescript');
      expect(detectLanguage('/path/to/file.TSX')).toBe('react-typescript');
    });

    test('should correctly detect Vue files', () => {
      expect(detectLanguage('/path/to/file.vue')).toBe('vue');
    });

    test('should correctly detect Python files', () => {
      expect(detectLanguage('/path/to/file.py')).toBe('python');
    });

    test('should correctly detect Java files', () => {
      expect(detectLanguage('/path/to/file.java')).toBe('java');
    });

    test('should correctly detect C++ files', () => {
      expect(detectLanguage('/path/to/file.cpp')).toBe('cpp');
    });

    test('should correctly detect C files', () => {
      expect(detectLanguage('/path/to/file.c')).toBe('c');
    });

    test('should correctly detect PHP files', () => {
      expect(detectLanguage('/path/to/file.php')).toBe('php');
    });

    test('should correctly detect Ruby files', () => {
      expect(detectLanguage('/path/to/file.rb')).toBe('ruby');
    });

    test('should correctly detect Go files', () => {
      expect(detectLanguage('/path/to/file.go')).toBe('go');
    });

    test('should correctly detect Rust files', () => {
      expect(detectLanguage('/path/to/file.rs')).toBe('rust');
    });

    test('should correctly detect Swift files', () => {
      expect(detectLanguage('/path/to/file.swift')).toBe('swift');
    });

    test('should correctly detect Kotlin files', () => {
      expect(detectLanguage('/path/to/file.kt')).toBe('kotlin');
    });

    test('should correctly detect Scala files', () => {
      expect(detectLanguage('/path/to/file.scala')).toBe('scala');
    });

    test('should correctly detect C# files', () => {
      expect(detectLanguage('/path/to/file.cs')).toBe('csharp');
    });

    test('should correctly detect HTML files', () => {
      expect(detectLanguage('/path/to/file.html')).toBe('html');
    });

    test('should correctly detect CSS files', () => {
      expect(detectLanguage('/path/to/file.css')).toBe('css');
    });

    test('should correctly detect SCSS files', () => {
      expect(detectLanguage('/path/to/file.scss')).toBe('scss');
    });

    test('should correctly detect Less files', () => {
      expect(detectLanguage('/path/to/file.less')).toBe('less');
    });

    test('should correctly detect JSON files', () => {
      expect(detectLanguage('/path/to/file.json')).toBe('json');
    });

    test('should correctly detect YAML files', () => {
      expect(detectLanguage('/path/to/file.yaml')).toBe('yaml');
      expect(detectLanguage('/path/to/file.yml')).toBe('yaml');
    });

    test('should correctly detect Markdown files', () => {
      expect(detectLanguage('/path/to/README.md')).toBe('markdown');
    });

    test('should correctly detect SQL files', () => {
      expect(detectLanguage('/path/to/database.sql')).toBe('sql');
    });

    test('should return unknown for unrecognized extensions', () => {
      expect(detectLanguage('/path/to/file.xyz')).toBe('unknown');
      expect(detectLanguage('/path/to/file')).toBe('unknown');
      expect(detectLanguage('file.txt')).toBe('unknown');
    });
  });

  describe('hasTests', () => {
    test('should return true for content with Jest describe block', () => {
      const content = `describe('My tests', () => {});`;
      expect(hasTests(content, 'test.js')).toBe(true);
    });

    test('should return true for content with Jest test block', () => {
      const content = `test('should do something', () => {});`;
      expect(hasTests(content, 'test.js')).toBe(true);
    });

    test('should return true for content with Jest it block', () => {
      const content = `it('should do something else', () => {});`;
      expect(hasTests(content, 'test.js')).toBe(true);
    });

    test('should return true for content with assert', () => {
      const content = `assert(true, 'message');`;
      expect(hasTests(content, 'app.js')).toBe(true);
    });

    test('should return true for content with expect', () => {
      const content = `expect(true).toBe(true);`;
      expect(hasTests(content, 'app.js')).toBe(true);
    });

    test('should return true for content with should', () => {
      const content = `variable.should.be.true;`;
      expect(hasTests(content, 'app.js')).toBe(true);
    });

    test('should return true for content with @Test annotation (Java)', () => {
      const content = `class MyTest { @Test public void testMethod() {} }`;
      expect(hasTests(content, 'MyTest.java')).toBe(true);
    });

    test('should return true for content with def test_ (Python)', () => {
      const content = `def test_something(): pass`;
      expect(hasTests(content, 'test_app.py')).toBe(true);
    });

    test('should return true for content with function test (C/C++)', () => {
      const content = `void function test_func() {}`;
      expect(hasTests(content, 'test_main.c')).toBe(true);
    });

    test('should return true for a file named test.js', () => {
      const content = `const x = 1;`;
      expect(hasTests(content, 'my-test-file.js')).toBe(true);
    });

    test('should return true for a file named spec.js', () => {
      const content = `const x = 1;`;
      expect(hasTests(content, 'my-spec-file.js')).toBe(true);
    });

    test('should return false for content without test patterns and non-test file name', () => {
      const content = `const a = 1; const b = 2;`;
      expect(hasTests(content, 'utility.js')).toBe(false);
    });
  });

  describe('hasDocumentation', () => {
    test('should return true for JSDoc-style comments', () => {
      const content = `/**\n * My function\n */`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return true for XML documentation comments (C#)', () => {
      const content = `/// <summary>My class</summary>`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return true for Python docstrings (double quotes)', () => {
      const content = `"""My module"""`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return true for Python docstrings (single quotes)', () => {
      const content = `'''My module'''`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return true for Markdown headers', () => {
      const content = `# My Title`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return true for HTML comments', () => {
      const content = `<!-- My HTML comment -->`;
      expect(hasDocumentation(content)).toBe(true);
    });

    test('should return false for content without documentation patterns', () => {
      const content = `const a = 1; // A regular comment`;
      expect(hasDocumentation(content)).toBe(false);
    });
  });

  describe('assessComplexity', () => {
    test('should return low complexity for small files with few functions/classes', () => {
      const content = `function a() {}\nfunction b() {}\nconst c = 3;`;
      expect(assessComplexity(content)).toBe('low');
    });

    test('should return medium complexity for moderately sized files with some functions/classes', () => {
      let content = '';
      for (let i = 0; i < 250; i++) content += `// line ${i}\n`;
      for (let i = 0; i < 15; i++) content += `function func${i}() {}\n`;
      content += `class MyClass1 {}\nclass MyClass2 {}\n`;
      expect(assessComplexity(content)).toBe('medium');
    });

    test('should return high complexity for large files with many functions/classes', () => {
      let content = '';
      for (let i = 0; i < 600; i++) content += `// line ${i}\n`;
      for (let i = 0; i < 25; i++) content += `function func${i}() {}\n`;
      for (let i = 0; i < 7; i++) content += `class MyClass${i} {}\n`;
      expect(assessComplexity(content)).toBe('high');
    });

    test('should handle empty content', () => {
      const content = '';
      expect(assessComplexity(content)).toBe('low');
    });

    test('should handle content with only comments', () => {
      const content = `// comment 1\n// comment 2`;
      expect(assessComplexity(content)).toBe('low');
    });
  });
});
