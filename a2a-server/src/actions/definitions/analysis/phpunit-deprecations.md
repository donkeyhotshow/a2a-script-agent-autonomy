# phpunit-deprecations

PHPUnit Deprecations Detector: обнаруживает устаревшие PHPUnit функции и методы, помогает обновить до PHPUnit 11. **План:** [deprecation-detector](../../plans/deprecation-detector.md).

## Priority
70

## Triggers
- phpunit deprecations
- phpunit deprecation
- detect phpunit deprecations
- phpunit устаревшие
- PHPUnit deprecations

## Sub-actions

### 1. parse-output
Parse PHPUnit output to extract deprecation warnings and their locations.

**Input:** phpunitOutput (string)  
**Output:** deprecations[]

```typescript
export default async function run(input: { phpunitOutput: string }): Promise<{ 
  deprecations: Array<{
    file: string;
    line: number;
    method: string;
    message: string;
    type: string;
  }> 
}> {
  const deprecationRegex = /Deprecated:\s+(.+?)\s+in\s+(.+?):(\d+)/gi;
  const deprecations: Array<{
    file: string;
    line: number;
    method: string;
    message: string;
    type: string;
  }> = [];
  
  let match;
  while ((match = deprecationRegex.exec(input.phpunitOutput)) !== null) {
    deprecations.push({
      file: match[2],
      line: parseInt(match[3], 10),
      method: match[1],
      message: match[0],
      type: 'phpunit-deprecation'
    });
  }
  
  return { deprecations };
}
```

### 2. identify-deprecations
Identify specific deprecated PHPUnit functions/methods and map to their modern equivalents.

**Input:** deprecations[]  
**Output:** identified[]

```typescript
export default async function run(input: { 
  deprecations: Array<{
    file: string;
    line: number;
    method: string;
    message: string;
    type: string;
  }>
}): Promise<{
  identified: Array<{
    file: string;
    line: number;
    deprecated: string;
    replacement: string;
    severity: 'high' | 'medium' | 'low';
    phpunitVersion: string;
  }>
}> {
  // PHPUnit 10-11 deprecations mapping
  const deprecationMap: Record<string, { replacement: string; severity: 'high' | 'medium' | 'low'; phpunitVersion: string }> = {
    'assertInternalType': { replacement: 'assertIsArray/assertIsBool/assertIsInt/etc.', severity: 'high', phpunitVersion: '10' },
    'assertAttributeEquals': { replacement: 'setPrivateProperty() + assertEquals()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNotEquals': { replacement: 'setPrivateProperty() + assertNotEquals()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeSame': { replacement: 'setPrivateProperty() + assertSame()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNotSame': { replacement: 'setPrivateProperty() + assertNotSame()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeContains': { replacement: 'setPrivateProperty() + assertContains()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNotContains': { replacement: 'setPrivateProperty() + assertNotContains()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeCount': { replacement: 'setPrivateProperty() + assertCount()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeEmpty': { replacement: 'setPrivateProperty() + assertEmpty()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNotEmpty': { replacement: 'setPrivateProperty() + assertNotEmpty()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeInstanceOf': { replacement: 'setPrivateProperty() + assertInstanceOf()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNull': { replacement: 'setPrivateProperty() + assertNull()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeNotNull': { replacement: 'setPrivateProperty() + assertNotNull()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeTrue': { replacement: 'setPrivateProperty() + assertTrue()', severity: 'high', phpunitVersion: '10' },
    'assertAttributeFalse': { replacement: 'setPrivateProperty() + assertFalse()', severity: 'high', phpunitVersion: '10' },
    'getMock': { replacement: 'createMock() or createStub()', severity: 'high', phpunitVersion: '9' },
    'getMockBuilder': { replacement: 'getMockBuilder() is deprecated, use createMock()', severity: 'medium', phpunitVersion: '9' },
    'setUp': { replacement: 'setUp(): void (with return type)', severity: 'medium', phpunitVersion: '10' },
    'tearDown': { replacement: 'tearDown(): void (with return type)', severity: 'medium', phpunitVersion: '10' },
    'setUpBeforeClass': { replacement: 'setUpBeforeClass(): void (static, with return type)', severity: 'medium', phpunitVersion: '10' },
    'tearDownAfterClass': { replacement: 'tearDownAfterClass(): void (static, with return type)', severity: 'medium', phpunitVersion: '10' },
    'expectExceptionMessage': { replacement: 'expectExceptionMessage(string) - now requires exact match', severity: 'medium', phpunitVersion: '10' },
    'addMethods': { replacement: 'onlyMethods() and onlyStaticMethods()', severity: 'medium', phpunitVersion: '10' },
    'getStaticMethods': { replacement: 'getMockBuilder()->getMockClass()', severity: 'low', phpunitVersion: '10' },
    'setMethods': { replacement: 'onlyMethods()', severity: 'medium', phpunitVersion: '10' },
    'setConstructorArgs': { replacement: 'setConstructorArgs() moved to MockBuilder', severity: 'medium', phpunitVersion: '10' },
    'addToAssertionCount': { replacement: 'addToAssertionCount() removed, use expectNotToPerformAssertions()', severity: 'high', phpunitVersion: '11' },
    'any': { replacement: 'anything() from PHPUnit\Framework\Constraint', severity: 'low', phpunitVersion: '10' },
    'callback': { replacement: 'callback() moved to PHPUnit\Framework\Constraint', severity: 'low', phpunitVersion: '10' }
  };

  const identified = input.deprecations.map(dep => {
    let deprecated = dep.method;
    let info = deprecationMap[deprecated];
    
    if (!info) {
      // Try to find partial match
      for (const [key, value] of Object.entries(deprecationMap)) {
        if (deprecated.toLowerCase().includes(key.toLowerCase())) {
          info = value;
          deprecated = key;
          break;
        }
      }
    }
    
    return {
      file: dep.file,
      line: dep.line,
      deprecated: dep.method,
      replacement: info?.replacement || 'Manual update required',
      severity: info?.severity || 'medium',
      phpunitVersion: info?.phpunitVersion || '10+'
    };
  });
  
  return { identified };
}
```

### 3. generate-fix-plan
Generate a fix plan with prioritized deprecations and recommendations.

**Input:** identified[]  
**Output:** fixPlan

```typescript
export default async function run(input: { 
  identified: Array<{
    file: string;
    line: number;
    deprecated: string;
    replacement: string;
    severity: 'high' | 'medium' | 'low';
    phpunitVersion: string;
  }>
}): Promise<{
  fixPlan: {
    summary: string;
    highPriority: Array<{ file: string; line: number; deprecated: string; replacement: string }>;
    mediumPriority: Array<{ file: string; line: number; deprecated: string; replacement: string }>;
    lowPriority: Array<{ file: string; line: number; deprecated: string; replacement: string }>;
    recommendations: string[];
  }
}> {
  const highPriority = input.identified.filter(d => d.severity === 'high');
  const mediumPriority = input.identified.filter(d => d.severity === 'medium');
  const lowPriority = input.identified.filter(d => d.severity === 'low');
  
  const recommendations = [
    '1. Upgrade PHPUnit to version 10 or 11',
    '2. Update return types for setUp(), tearDown(), setUpBeforeClass(), tearDownAfterClass()',
    '3. Replace assertInternalType with specific type assertions (assertIsArray, assertIsInt, etc.)',
    '4. Replace attribute assertions with ReflectionProperty + specific assertions',
    '5. Replace getMock() with createMock() or createStub()',
    '6. Run tests in PHPUnit 9 compatibility mode first, then upgrade to 10'
  ];
  
  const summary = `Found ${input.identified.length} PHPUnit deprecations: ${highPriority.length} high priority, ${mediumPriority.length} medium priority, ${lowPriority.length} low priority.`;
  
  return {
    fixPlan: {
      summary,
      highPriority: highPriority.map(d => ({ file: d.file, line: d.line, deprecated: d.deprecated, replacement: d.replacement })),
      mediumPriority: mediumPriority.map(d => ({ file: d.file, line: d.line, deprecated: d.deprecated, replacement: d.replacement })),
      lowPriority: lowPriority.map(d => ({ file: d.file, line: d.line, deprecated: d.deprecated, replacement: d.replacement })),
      recommendations
    }
  };
}
```
