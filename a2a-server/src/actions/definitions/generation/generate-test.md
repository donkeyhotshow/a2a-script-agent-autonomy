# generate-test

Генерация тестов: Unit/Feature. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
75

## Triggers
- generate test
- create test
- unit test
- feature test

## Sub-actions

### 1. generate-test-spec
Analyze target file and determine test requirements.

**Input:** targetFile, type?, rootDir?  
**Output:** testSpec

```typescript
export default async function analyzeTest(input: { targetFile: string; type?: string; rootDir?: string }): Promise<{ testSpec: { className: string; testType: 'unit' | 'feature' | 'integration'; methods: string[]; assertions: string[]; needsSetup: boolean; needsMock: boolean } }> {
  const { targetFile, type } = input;
  
  // Determine test type
  let testType: 'unit' | 'feature' | 'integration' = 'unit';
  if (type === 'feature' || type === 'integration') {
    testType = type;
  } else if (input.type === undefined) {
    testType = 'unit';
  }
  
  // Extract class name from target file
  const classMatch = targetFile.match(/\/(\w+)\.(ts|js|php)$/);
  const className = classMatch ? classMatch[1] : 'ClassName';
  
  // Determine test methods based on target
  let methods: string[] = [];
  let assertions: string[] = [];
  let needsSetup = false;
  let needsMock = false;
  
  if (targetFile.includes('Controller')) {
    methods = ['test_index', 'test_show', 'test_store', 'test_update', 'test_destroy'];
    assertions = ['assertStatus', 'assertJson', 'assertDatabaseHas'];
    testType = 'feature';
    needsMock = true;
  } else if (targetFile.includes('Service')) {
    methods = ['test_can_instantiate', 'test_method_calls'];
    assertions = ['assertTrue', 'assertEquals'];
    needsSetup = true;
  } else if (targetFile.includes('Model')) {
    methods = ['test_can_create', 'test_attributes'];
    assertions = ['assertInstanceOf'];
    needsSetup = true;
  } else {
    methods = ['test_example'];
    assertions = ['assertTrue'];
  }
  
  return {
    testSpec: {
      className,
      testType,
      methods,
      assertions,
      needsSetup,
      needsMock
    }
  };
}
```

### 2. generate-test-create
Create test file with basic structure.

**Input:** testSpec, rootDir?  
**Output:** testFile

```typescript
export default async function createTest(input: { testSpec: { className: string; testType: 'unit' | 'feature' | 'integration'; methods: string[]; assertions: string[]; needsSetup: boolean; needsMock: boolean }; rootDir?: string }): Promise<{ testFile: { path: string; code: string } }> {
  const { className, testType, methods, needsSetup, needsMock } = input.testSpec;
  const rootDir = input.rootDir || process.cwd();
  
  // Determine test path based on test type
  let path: string;
  if (testType === 'feature') {
    path = `${rootDir}/tests/Feature/${className}Test.php`;
  } else if (testType === 'integration') {
    path = `${rootDir}/tests/Integration/${className}Test.php`;
  } else {
    path = `${rootDir}/tests/Unit/${className}Test.php`;
  }
  
  // Generate test methods
  const testMethods = methods.map(method => {
    const methodName = method.replace('test_', '');
    
    return `
    public function test_${methodName}()
    {
        ${needsSetup ? '$this->setUp();' : ''}
        ${needsMock ? '// TODO: Add mock setup' : ''}
        
        // Arrange
        // $this->...
        
        // Act
        // $result = ...
        
        // Assert
        $this->assertTrue(true);
    }`;
  }).join('\n');
  
  const code = `<?php

namespace Tests\\${testType === 'unit' ? 'Unit' : testType === 'feature' ? 'Feature' : 'Integration'};

use Tests\\TestCase;
use App\\Models\\${className};

class ${className}Test extends TestCase
{
${needsSetup ? '    protected function setUp(): void
    {
        parent::setUp();
    }
' : ''}${testMethods}
}
`;

  return {
    testFile: {
      path,
      code
    }
  };
}
```

### 3. generate-test-assertions
Generate assertion helpers for test.

**Input:** testSpec, targetFile  
**Output:** assertionsCode

```typescript
export default async function generateAssertions(input: { testSpec: { assertions: string[] }; targetFile: string }): Promise<{ assertionsCode: string }> {
  const { assertions } = input.testSpec;
  
  let assertionsCode = '';
  
  // Laravel assertions
  if (assertions.includes('assertStatus')) {
    assertionsCode += `
    // Assert HTTP status
    $response->assertStatus(200);`;
  }
  
  if (assertions.includes('assertJson')) {
    assertionsCode += `
    // Assert JSON structure
    $response->assertJsonStructure([
        'data' => ['*' => ['id', 'name']]
    ]);`;
  }
  
  if (assertions.includes('assertDatabaseHas')) {
    assertionsCode += `
    // Assert database has record
    $this->assertDatabaseHas('${input.targetFile.split('/').pop()?.replace('.php', '')}s', [
        'name' => 'test'
    ]);`;
  }
  
  if (assertions.includes('assertTrue')) {
    assertionsCode += `
    // Assert true
    $this->assertTrue($result);`;
  }
  
  if (assertions.includes('assertEquals')) {
    assertionsCode += `
    // Assert equals
    $this->assertEquals($expected, $actual);`;
  }
  
  if (assertions.includes('assertInstanceOf')) {
    assertionsCode += `
    // Assert instance
    $this->assertInstanceOf(${input.testSpec.assertions[0]}::class, $model);`;
  }
  
  return { assertionsCode };
}
```

### 4. generate-test-mocks
Generate mock setup for test.

**Input:** testSpec, rootDir?  
**Output:** mocksCode

```typescript
export default async function generateMocks(input: { testSpec: { className: string }; rootDir?: string }): Promise<{ mocksCode: string }> {
  const { className } = input.testSpec;
  
  const mocksCode = `
    // Mock setup example
    $this->mock(\\App\\Services\\${className}Service::class, function ($mock) {
        $mock->shouldReceive('method')
            ->once()
            ->andReturn(true);
    });
    
    // Or use partial mock
    $this->partialMock(${className}::class, function ($mock) {
        $mock->shouldReceive('method')
            ->once()
            ->andReturn(true);
    });
`;

  return { mocksCode };
}
```

### 5. generate-test-validate
Validate generated test code.

**Input:** testFile  
**Output:** valid, errors

```typescript
export default async function validateTest(input: { testFile: { code: string } }): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const code = input.testFile.code;
  
  // Check for required elements
  if (!code.includes('<?php')) {
    errors.push('Missing PHP opening tag');
  }
  
  if (!code.includes('namespace Tests')) {
    errors.push('Missing test namespace');
  }
  
  if (!code.includes('extends TestCase')) {
    errors.push('Test must extend TestCase');
  }
  
  // Check for test methods
  const hasTestMethod = code.match(/public function test\w+/);
  if (!hasTestMethod) {
    errors.push('Test must have at least one test method (test*)');
  }
  
  // Check for assertions
  if (!code.includes('assert')) {
    errors.push('Test should have assertions');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### 6. generate-test-run
Run generated tests.

**Input:** testFile, rootDir?  
**Output:** results

```typescript
export default async function runTest(input: { testFile: { path: string }; rootDir?: string }): Promise<{ results: { passed: number; failed: number; errors: string[] } }> {
  const rootDir = input.rootDir || process.cwd();
  
  // In real implementation, would run:
  // php artisan test --filter=TestClassName
  // or
  // ./vendor/bin/phpunit path/to/test
  
  return {
    results: {
      passed: 0,
      failed: 0,
      errors: ['Test execution requires client context']
    }
  };
}
```
