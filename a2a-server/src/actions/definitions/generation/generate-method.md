# generate-method

Генерация метода: добавление метода в класс. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
75

## Triggers
- generate method
- add method
- добавить метод

## Sub-actions

### 1. generate-method-analyze
Parse target class and task to understand requirements.

**Input:** targetFile, task, rootDir?  
**Output:** spec

```typescript
export default async function analyzeMethod(input: { targetFile: string; task: string; rootDir?: string }): Promise<{ spec: { className: string; methodName: string; returnType: string; parameters: Array<{ name: string; type: string; optional: boolean }>; visibility: string; isStatic: boolean; isAsync: boolean; body: string } }> {
  const { targetFile, task } = input;
  
  // Extract class name from file path
  const classMatch = targetFile.match(/\/(\w+)\.(ts|js|php)$/);
  const className = classMatch ? classMatch[1] : 'ClassName';
  
  // Parse method details from task
  const methodMatch = task.match(/method\s+(\w+)|function\s+(\w+)|добавь\s+метод\s+(\w+)/i);
  const methodName = (methodMatch?.[1] || methodMatch?.[2] || methodMatch?.[3] || 'newMethod').replace(/\?$/, '');
  
  // Determine visibility
  let visibility = 'public';
  if (task.includes('private')) visibility = 'private';
  if (task.includes('protected')) visibility = 'protected';
  
  // Check for static
  const isStatic = task.includes('static');
  
  // Check for async
  const isAsync = task.includes('async') || task.includes('await');
  
  // Determine return type
  let returnType = 'void';
  if (task.includes('return') || task.includes('возвращает')) {
    if (task.includes('array') || task.includes('массив')) returnType = 'array';
    else if (task.includes('string')) returnType = 'string';
    else if (task.includes('bool') || task.includes('boolean')) returnType = 'boolean';
    else if (task.includes('int') || task.includes('integer')) returnType = 'int';
    else if (task.includes('Promise')) returnType = 'Promise<any>';
  }
  
  // Extract parameters
  const params: Array<{ name: string; type: string; optional: boolean }> = [];
  const paramMatch = task.match(/\(([^)]+)\)/);
  if (paramMatch) {
    const paramStr = paramMatch[1];
    paramStr.split(',').forEach(p => {
      const [name, type] = p.trim().split(':').map(s => s.trim());
      if (name) {
        params.push({
          name,
          type: type || 'any',
          optional: p.includes('?') || p.includes('optional')
        });
      }
    });
  }
  
  // Generate method body placeholder
  const body = `// TODO: Implement ${methodName}`;
  
  return {
    spec: {
      className,
      methodName,
      returnType,
      parameters: params,
      visibility,
      isStatic,
      isAsync,
      body
    }
  };
}
```

### 2. generate-method-template
Generate method code from template.

**Input:** spec, targetFile, language?  
**Output:** methodCode

```typescript
export default async function generateMethodTemplate(input: { spec: { methodName: string; returnType: string; parameters: Array<{ name: string; type: string; optional: boolean }>; visibility: string; isStatic: boolean; isAsync: boolean; body: string }; targetFile: string; language?: string }): Promise<{ methodCode: string; fileExtension: string }> {
  const { spec } = input;
  const targetFile = input.targetFile || '';
  
  // Determine language from file extension
  let lang = input.language || 'typescript';
  if (targetFile.endsWith('.php')) lang = 'php';
  else if (targetFile.endsWith('.js')) lang = 'javascript';
  else if (targetFile.endsWith('.ts')) lang = 'typescript';
  
  // Build parameter string
  const paramsStr = spec.parameters
    .map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`)
    .join(', ');
  
  // Build method signature
  const staticPrefix = spec.isStatic ? 'static ' : '';
  const asyncPrefix = spec.isAsync ? 'async ' : '';
  const methodSignature = `${spec.visibility} ${staticPrefix}${asyncPrefix}${spec.methodName}(${paramsStr}): ${spec.returnType}`;
  
  let methodCode = '';
  
  if (lang === 'typescript' || lang === 'javascript') {
    methodCode = `
${methodSignature} {
${spec.body}
}
`;
  } else if (lang === 'php') {
    methodCode = `
    ${spec.visibility} ${staticPrefix}function ${spec.methodName}(${paramsStr})${spec.returnType !== 'void' ? ': ' + spec.returnType : ''}
    {
        ${spec.body}
    }
`;
  }
  
  return {
    methodCode,
    fileExtension: lang === 'php' ? '.php' : lang === 'typescript' ? '.ts' : '.js'
  };
}
```

### 3. generate-method-apply
Apply method to target class file.

**Input:** methodCode, targetFile, rootDir?  
**Output:** applied, filePath

```typescript
export default async function applyMethod(input: { methodCode: string; targetFile: string; rootDir?: string }): Promise<{ applied: boolean; filePath: string; lineNumber?: number; error?: string }> {
  const { methodCode, targetFile } = input;
  const rootDir = input.rootDir || process.cwd();
  const fullPath = `${rootDir}/${targetFile}`;
  
  // In real implementation:
  // 1. Read existing file
  // 2. Parse to find appropriate insertion point (after last method or after constructor)
  // 3. Insert method code
  // 4. Validate syntax
  // 5. Write back
  
  // Placeholder response
  return {
    applied: false,
    filePath: fullPath,
    lineNumber: 0,
    error: 'File system operations require client context'
  };
}
```

### 4. generate-method-validate
Validate generated method code.

**Input:** methodCode, targetFile  
**Output:** valid, errors

```typescript
export default async function validateMethod(input: { methodCode: string; targetFile: string }): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic syntax validation
  if (!input.methodCode || input.methodCode.trim().length === 0) {
    errors.push('Method code is empty');
  }
  
  // Check for balanced braces
  const openBraces = (input.methodCode.match(/{/g) || []).length;
  const closeBraces = (input.methodCode.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unbalanced braces in method');
  }
  
  // Check for TODO
  if (input.methodCode.includes('TODO')) {
    warnings.push('Method contains TODO - needs implementation');
  }
  
  // Validate return statement for non-void methods
  if (input.methodCode.includes('void') && input.methodCode.includes('return ')) {
    warnings.push('void method should not have return statement');
  }
  
  // Check for proper visibility
  if (!input.methodCode.includes('public') && !input.methodCode.includes('private') && !input.methodCode.includes('protected')) {
    warnings.push('Method should have explicit visibility modifier');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### 5. generate-method-test
Generate unit test for the method.

**Input:** spec, targetFile  
**Output:** testCode, testFilePath

```typescript
export default async function generateMethodTest(input: { spec: { className: string; methodName: string; parameters: Array<{ name: string; type: string }>; returnType: string }; targetFile: string }): Promise<{ testCode: string; testFilePath: string }> {
  const { className, methodName, parameters, returnType } = input.spec;
  
  // Determine test file path
  const testFilePath = input.targetFile.replace(/\.(ts|js)$/, '.test.$1');
  
  // Build test parameters
  const testParams = parameters
    .slice(0, 2)
    .map(p => `${p.name}: ${p.type}`)
    .join(', ');
  
  // Generate test code
  const testCode = `
describe('${className}.${methodName}', () => {
    it('should ${methodName}', () => {
        // Arrange
        const instance = new ${className}();
        
        // Act
        const result = instance.${methodName}(${testParams ? 'mock' + testParams.replace(/,/g, ', mock') : ''});
        
        // Assert
        expect(result).toBeDefined();
    });
    
    it('should handle errors', () => {
        // Arrange
        const instance = new ${className}();
        
        // Act & Assert
        expect(() => instance.${methodName}()).toThrow();
    });
});
`;
  
  return { testCode, testFilePath };
}
```
