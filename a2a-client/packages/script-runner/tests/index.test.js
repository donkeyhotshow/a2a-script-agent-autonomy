/**
 * Script Runner unit tests
 */
import { executeScript, ScriptRunner, scriptRunner } from '../dist/index.js';

// Simple test runner
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    failed++;
  }
}

// Test context
const context = {
  sessionId: 'test-session',
  workingDir: '/test/project',
};

// Run tests
console.log('\n=== Script Runner Tests ===\n');

// Test: простой код
await test('выполняет синхронную функцию run', async () => {
  const code = `
    const run = (input) => {
      return input.a + input.b;
    };
  `;
  const result = await executeScript(code, { a: 10, b: 20 }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 30, `Expected data to be 30, got ${result.data}`);
});

await test('возвращает простой объект из функции run', async () => {
  const code = `
    const run = (input) => {
      return { message: 'Hello, ' + input.name };
    };
  `;
  const result = await executeScript(code, { name: 'World' }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data.message === 'Hello, World', `Expected message "Hello, World", got ${result.data.message}`);
});

await test('возвращает null если функция run не определена', async () => {
  const code = `const x = 42;`;
  const result = await executeScript(code, {}, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === null, `Expected data to be null, got ${result.data}`);
});

// Test: передача контекста
await test('передаёт числовые значения через input', async () => {
  const code = `
    const run = (input) => {
      const sum = input.x + input.y;
      return { sum: sum };
    };
  `;
  const result = await executeScript(code, { x: 5, y: 7 }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data.sum === 12, `Expected sum to be 12, got ${result.data.sum}`);
});

await test('передаёт строковые значения через input', async () => {
  const code = `
    const run = (input) => {
      return { greeting: 'Hello, ' + input.name };
    };
  `;
  const result = await executeScript(code, { name: 'Test' }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data.greeting === 'Hello, Test', `Expected greeting "Hello, Test", got ${result.data.greeting}`);
});

// Test: обработка ошибок
await test('возвращает ошибку при throw', async () => {
  const code = `
    const run = (input) => {
      throw new Error('Test error message');
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === false, 'Expected success to be false');
  assert(result.error.includes('Test error message'), `Expected error to include "Test error message", got ${result.error}`);
});

await test('возвращает ошибку при синтаксической ошибке', async () => {
  const code = `
    const run = (input) => {
      return { x: ; // syntax error
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === false, 'Expected success to be false');
  assert(result.error !== undefined, 'Expected error to be defined');
});

await test('возвращает ошибку при обращении к неопределённой переменной', async () => {
  const code = `
    const run = (input) => {
      return undefinedVariable;
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === false, 'Expected success to be false');
  assert(result.error !== undefined, 'Expected error to be defined');
});

// Test: TypeScript транспиляция
await test('удаляет type annotations', async () => {
  const code = `
    const run = (input: any): string => {
      return 'typed result';
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 'typed result', `Expected data to be "typed result", got ${result.data}`);
});

await test('удаляет interface declarations', async () => {
  const code = `
    interface Input {
      value: number;
    }
    const run = (input) => {
      return input.value * 2;
    };
  `;
  const result = await executeScript(code, { value: 5 }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 10, `Expected data to be 10, got ${result.data}`);
});

// Test: безопасность
await test('не имеет доступа к process', async () => {
  const code = `
    const run = (input) => {
      return typeof process;
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 'undefined', `Expected data to be "undefined", got ${result.data}`);
});

await test('не имеет доступа к глобальному require', async () => {
  const code = `
    const run = (input) => {
      return typeof require;
    };
  `;
  const result = await executeScript(code, {}, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 'undefined', `Expected data to be "undefined", got ${result.data}`);
});

// Test: ScriptRunner class
await test('ScriptRunner регистрирует скрипт по ID', async () => {
  const runner = new ScriptRunner();
  runner.registerScript('test-script', 'const run = () => 42;');
  assert(runner.hasScript('test-script') === true, 'Expected hasScript to be true');
});

await test('ScriptRunner возвращает false для несуществующего скрипта', async () => {
  const runner = new ScriptRunner();
  assert(runner.hasScript('non-existent') === false, 'Expected hasScript to be false');
});

await test('ScriptRunner выполняет зарегистрированный скрипт', async () => {
  const runner = new ScriptRunner();
  runner.registerScript('double', `
    const run = (input) => input.value * 2;
  `);
  const result = await runner.run('double', { value: 21 }, context);
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 42, `Expected data to be 42, got ${result.data}`);
});

await test('ScriptRunner возвращает ошибку для несуществующего скрипта', async () => {
  const runner = new ScriptRunner();
  const result = await runner.run('non-existent', {}, context);
  assert(result.success === false, 'Expected success to be false');
  assert(result.error.includes('not found'), `Expected error to include "not found", got ${result.error}`);
  assert(result.duration_ms === 0, 'Expected duration_ms to be 0');
});

await test('ScriptRunner очищает все скрипты', async () => {
  const runner = new ScriptRunner();
  runner.registerScript('script1', 'code1');
  runner.registerScript('script2', 'code2');
  runner.clear();
  assert(runner.hasScript('script1') === false, 'Expected hasScript("script1") to be false');
  assert(runner.hasScript('script2') === false, 'Expected hasScript("script2") to be false');
});

// Test: singleton
await test('scriptRunner является экземпляром ScriptRunner', async () => {
  assert(scriptRunner instanceof ScriptRunner, 'Expected scriptRunner to be instance of ScriptRunner');
});

await test('scriptRunner может регистрировать и выполнять скрипты', async () => {
  scriptRunner.registerScript('singleton-test', `
    const run = (input) => input.x + input.y;
  `);
  const result = await scriptRunner.run('singleton-test', { x: 1, y: 2 }, {
    sessionId: 'test',
    workingDir: '/test',
  });
  assert(result.success === true, 'Expected success to be true');
  assert(result.data === 3, `Expected data to be 3, got ${result.data}`);
  scriptRunner.clear();
});

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
