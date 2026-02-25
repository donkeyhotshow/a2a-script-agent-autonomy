import { detectLanguage, hasTests, hasDocumentation, assessComplexity } from '../src/code-analyzer.js';
import { FileUtils } from '../../file-utils/src/file-utils.js'; // Import as ES Module
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';

describe('CodeAnalyzer интеграционные тесты', () => {
  const testDir = path.join(os.tmpdir(), 'temp-code-analyzer-test');

  beforeAll(async () => {
    await fs.ensureDir(testDir);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  test('detectLanguage должен правильно определять язык для реальных файлов', async () => {
    const fileUtils = new FileUtils({}); // Pass a mock logger
    const jsFilePath = path.join(testDir, 'test.js');
    await fileUtils.writeFile(jsFilePath, 'console.log("Hello");');
    expect(detectLanguage(jsFilePath)).toBe('javascript');

    const pyFilePath = path.join(testDir, 'script.py');
    await fileUtils.writeFile(pyFilePath, 'print("Hello")');
    expect(detectLanguage(pyFilePath)).toBe('python');

    const jsonFilePath = path.join(testDir, 'config.json');
    await fileUtils.writeFile(jsonFilePath, '{ "key": "value" }');
    expect(detectLanguage(jsonFilePath)).toBe('json');

    const unknownFilePath = path.join(testDir, 'unknown.xyz');
    await fileUtils.writeFile(unknownFilePath, 'some content');
    expect(detectLanguage(unknownFilePath)).toBe('unknown');
  });

  test('hasTests должен корректно определять наличие тестов в реальных файлах', async () => {
    const fileUtils = new FileUtils({}); // Pass a mock logger
    const fileWithTests = path.join(testDir, 'my-module.test.js');
    await fileUtils.writeFile(fileWithTests, 'describe("My Module", () => { test("should work", () => {}); });');
    expect(hasTests(await fileUtils.readFile(fileWithTests), fileWithTests)).toBe(true);

    const fileWithoutTests = path.join(testDir, 'my-module.js');
    await fileUtils.writeFile(fileWithoutTests, 'function myFunction() { return 1; }');
    expect(hasTests(await fileUtils.readFile(fileWithoutTests), fileWithoutTests)).toBe(false);
  });

  test('hasDocumentation должен корректно определять наличие документации в реальных файлах', async () => {
    const fileUtils = new FileUtils({}); // Pass a mock logger
    const fileWithDocs = path.join(testDir, 'documented.js');
    await fileUtils.writeFile(fileWithDocs, '/**\n * This is a doc block\n */\nfunction documentedFunction() {}');
    expect(hasDocumentation(await fileUtils.readFile(fileWithDocs))).toBe(true);

    const fileWithoutDocs = path.join(testDir, 'undocumented.js');
    await fileUtils.writeFile(fileWithoutDocs, 'function undocumentedFunction() {}');
    expect(hasDocumentation(await fileUtils.readFile(fileWithoutDocs))).toBe(false);
  });

  test('assessComplexity должен корректно оценивать сложность реальных файлов', async () => {
    const fileUtils = new FileUtils({}); // Pass a mock logger
    const simpleFile = path.join(testDir, 'simple.js');
    await fileUtils.writeFile(simpleFile, 'function add(a, b) { return a + b; }');
    expect(assessComplexity(await fileUtils.readFile(simpleFile))).toBe('low');

    const mediumFile = path.join(testDir, 'medium.js');
    const mediumContent = Array(50).fill('console.log("line");').join('\n') + '\nfunction func1() {}\nfunction func2() {}\nfunction func3() {}\nfunction func4() {}\nfunction func5() {}\n';
    await fileUtils.writeFile(mediumFile, mediumContent);
    expect(assessComplexity(await fileUtils.readFile(mediumFile))).toBe('medium');

    const complexFile = path.join(testDir, 'complex.js');
    const complexContent = Array(300).fill('console.log("line");').join('\n') +
      Array(15).fill('function func() {}\n').join('') +
      Array(3).fill('class MyClass {}\n').join('');
    await fileUtils.writeFile(complexFile, complexContent);
    expect(assessComplexity(await fileUtils.readFile(complexFile))).toBe('high');
  });
});
