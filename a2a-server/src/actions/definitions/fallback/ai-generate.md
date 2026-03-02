# ai-generate

Generic AI-based code generation. Priority: 15. **План:
** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Context

```json
{ "type": "generation", "llm_required": true }
```

## Triggers

- generate with ai
- ai generate
- create with ai
- сгенерируй код
- напиши код

## Sub-actions

### 1. ai-generate-prompt

Построение промпта генерации из задачи и контекста.

**Input:** task, context?, language?, framework?  
**Output:** prompt

```typescript
interface GenerationContext {
  files?: Array<{
    path: string;
    content: string;
  }>;
  language?: string;
  framework?: string;
  projectRoot?: string;
  existingTypes?: string[];
}

interface PromptResult {
  prompt: string;
  constraints: string[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

// System prompt for code generation
const GENERATION_SYSTEM_PROMPT = `You are an expert code generator. Generate clean, well-structured, and production-ready code based on the user's request.

Guidelines:
1. Follow best practices for the target language/framework
2. Include proper error handling
3. Use meaningful variable and function names
4. Add comments for complex logic
5. Consider type safety (TypeScript/JavaScript)
6. Match the existing code style in the project

If the request is ambiguous, make reasonable assumptions and state them.`;

export default async function buildGenerationPrompt(input: { 
  task: string;
  context?: GenerationContext;
  language?: string;
  framework?: string;
}): Promise<PromptResult> {
  const constraints: string[] = [];
  let complexity: PromptResult['estimatedComplexity'] = 'simple';
  
  // Determine complexity
  const taskLength = input.task.split(/\s+/).length;
  const hasMultiple = input.task.includes('and') || input.task.includes(',');
  
  if (taskLength > 50 || hasMultiple) {
    complexity = 'complex';
  } else if (taskLength > 20) {
    complexity = 'medium';
  }
  
  const parts: string[] = [];
  
  // Add system prompt
  parts.push(GENERATION_SYSTEM_PROMPT);
  
  // Add language/framework context
  if (input.language || input.framework || input.context?.language || input.context?.framework) {
    const lang = input.language || input.context?.language || 'TypeScript';
    const fw = input.framework || input.context?.framework;
    
    parts.push(`\nTarget language: ${lang}${fw ? ` (using ${fw})` : ''}`);
    constraints.push(`Use ${lang}${fw ? ` with ${fw}` : ''}`);
  }
  
  // Add existing code context
  if (input.context?.files && input.context.files.length > 0) {
    parts.push('\n\nRelevant existing code:');
    
    for (const file of input.context.files.slice(0, 3)) {
      const filename = file.path.split(/[/\\]/).pop();
      parts.push(`\n// ${filename}\n${file.content.substring(0, 1500)}`);
    }
    
    constraints.push('Match existing code style and patterns');
  }
  
  // Add existing types/interfaces
  if (input.context?.existingTypes && input.context.existingTypes.length > 0) {
    parts.push('\n\nExisting types to reuse:');
    parts.push(input.context.existingTypes.join('\n'));
  }
  
  // Add the actual task
  parts.push(`\n\n## Task\n${input.task}`);
  
  // Add output format instructions
  parts.push(`
## Output format
Provide the generated code with:
1. Brief explanation of the approach
2. The complete code block
3. Any necessary imports or dependencies
4. Usage example if applicable
`);
  
  const prompt = parts.join('\n');
  
  return {
    prompt,
    constraints,
    estimatedComplexity: complexity
  };
}
```

### 2. ai-generate-llm

Вызов LLM для генерации кода.

**Input:** prompt, options?  
**Output:** draft, diff?

```typescript
interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GenerationResult {
  draft: string;
  diff?: string;
  language: string;
  files: Array<{
    name: string;
    content: string;
    action: 'create' | 'modify';
  }>;
  explanation: string;
}

// LLM Configuration (same as in ai-fallback)
const DEFAULT_CONFIG = {
  provider: 'ollama',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_MODEL || 'codellama'
};

export default async function generateCode(input: { 
  prompt: string;
  options?: GenerationOptions;
}): Promise<GenerationResult> {
  const config = DEFAULT_CONFIG;
  const model = input.options?.model || config.defaultModel;
  const temperature = input.options?.temperature ?? 0.5; // Lower for code generation
  const maxTokens = input.options?.maxTokens || 4096;
  
  // Prepare request (similar to ai-fallback)
  const requestBody = {
    model,
    prompt: input.prompt,
    temperature,
    options: {
      num_predict: maxTokens
    }
  };
  
  try {
    // In production, make actual API call
    // const response = await fetch(`${config.baseUrl}/api/generate`, { ... });
    
    // Mock response for demonstration
    const mockResponse = generateMockCodeResponse(input.prompt);
    
    return mockResponse;
  } catch (error) {
    throw new Error(`Code generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateMockCodeResponse(prompt: string): GenerationResult {
  // This would be replaced with actual LLM response
  const task = prompt.toLowerCase();
  
  // Detect target language
  let language = 'typescript';
  if (task.includes('python') || task.includes('py ')) {
    language = 'python';
  } else if (task.includes('php')) {
    language = 'php';
  } else if (task.includes('java ')) {
    language = 'java';
  } else if (task.includes('go ') || task.includes('golang')) {
    language = 'go';
  } else if (task.includes('rust')) {
    language = 'rust';
  }
  
  // Generate appropriate mock code
  const mockCode = generateMockCode(language);
  
  return {
    draft: mockCode,
    language,
    files: [
      {
        name: `GeneratedCode.${getExtension(language)}`,
        content: mockCode,
        action: 'create'
      }
    ],
    explanation: `Generated ${language} code based on your request. This is a placeholder - in production, the LLM would generate actual code based on the task description.`
  };
}

function generateMockCode(language: string): string {
  const codeSamples: Record<string, string> = {
    typescript: `// Generated TypeScript code
interface GeneratedOptions {
  id: string;
  name: string;
  value: number;
}

export class GeneratedClass {
  private options: GeneratedOptions;
  
  constructor(options: GeneratedOptions) {
    this.options = options;
  }
  
  public process(): void {
    console.log(\`Processing \${this.options.name}\`);
  }
  
  public getValue(): number {
    return this.options.value;
  }
}`,
    
    python: `# Generated Python code
from dataclasses import dataclass
from typing import Optional

@dataclass
class GeneratedOptions:
    id: str
    name: str
    value: int

class GeneratedClass:
    def __init__(self, options: GeneratedOptions):
        self.options = options
    
    def process(self) -> None:
        print(f"Processing {self.options.name}")
    
    def get_value(self) -> int:
        return self.options.value`,
    
    php: `<?php
// Generated PHP code

class GeneratedOptions
{
    public string $id;
    public string $name;
    public int $value;
}

class GeneratedClass
{
    private GeneratedOptions $options;
    
    public function __construct(GeneratedOptions $options)
    {
        $this->options = $options;
    }
    
    public function process(): void
    {
        echo "Processing {$this->options->name}";
    }
    
    public function getValue(): int
    {
        return $this->options->value;
    }
}`,
    
    java: `// Generated Java code
public class GeneratedOptions {
    private String id;
    private String name;
    private int value;
    
    // Constructors, getters, setters...
}

public class GeneratedClass {
    private GeneratedOptions options;
    
    public GeneratedClass(GeneratedOptions options) {
        this.options = options;
    }
    
    public void process() {
        System.out.println("Processing " + options.getName());
    }
    
    public int getValue() {
        return options.getValue();
    }
}`,
    
    go: `// Generated Go code
package generated

type GeneratedOptions struct {
    ID    string
    Name  string
    Value int
}

type GeneratedClass struct {
    options GeneratedOptions
}

func NewGeneratedClass(options GeneratedOptions) *GeneratedClass {
    return &GeneratedClass{options: options}
}

func (c *GeneratedClass) Process() {
    fmt.Printf("Processing %s\\n", c.options.Name)
}`,
    
    rust: `// Generated Rust code
#[derive(Debug)]
pub struct GeneratedOptions {
    pub id: String,
    pub name: String,
    pub value: i32,
}

pub struct GeneratedClass {
    options: GeneratedOptions,
}

impl GeneratedClass {
    pub fn new(options: GeneratedOptions) -> Self {
        Self { options }
    }
    
    pub fn process(&self) {
        println!("Processing {}", self.options.name);
    }
}`
  };
  
  return codeSamples[language] || codeSamples.typescript;
}

function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    python: 'py',
    php: 'php',
    java: 'java',
    go: 'go',
    rust: 'rs'
  };
  
  return extensions[language] || 'txt';
}
```

### 3. ai-generate-apply

Опциональное применение сгенерированного кода (с подтверждением).

**Input:** draft, files?, confirm?, dryRun?  
**Output:** applied[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface GeneratedFile {
  name: string;
  content: string;
  action: 'create' | 'modify';
  targetPath?: string;
}

interface ApplyResult {
  applied: string[];
  failed: Array<{
    file: string;
    error: string;
  }>;
  skipped: string[];
  summary: string;
}

export default async function applyGeneratedCode(input: { 
  draft: string;
  files?: GeneratedFile[];
  confirm?: boolean;
  dryRun?: boolean;
  outputDir?: string;
}): Promise<ApplyResult> {
  const applied: string[] = [];
  const failed: Array<{ file: string; error: string }> = [];
  const skipped: string[] = [];
  
  // If no explicit files provided, try to parse from draft
  let filesToApply = input.files || [];
  
  if (filesToApply.length === 0) {
    // Try to extract code blocks from draft
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(input.draft)) !== null) {
      const content = match[1].trim();
      filesToApply.push({
        name: 'generated_code.txt',
        content,
        action: 'create'
      });
    }
  }
  
  // If still no files, use the whole draft
  if (filesToApply.length === 0) {
    filesToApply.push({
      name: 'generated_code.txt',
      content: input.draft,
      action: 'create'
    });
  }
  
  // Determine output directory
  const outputDir = input.outputDir || process.cwd();
  
  if (!input.confirm && !input.dryRun) {
    // Return files to be applied without actually applying
    return {
      applied: [],
      failed: [],
      skipped: filesToApply.map(f => f.name),
      summary: `Would apply ${filesToApply.length} file(s) - confirmation required`
    };
  }
  
  // Apply each file
  for (const file of filesToApply) {
    try {
      let targetPath: string;
      
      if (file.targetPath) {
        targetPath = path.join(outputDir, file.targetPath);
      } else {
        // Generate filename from content if possible
        const filename = file.name || 'generated_code.txt';
        targetPath = path.join(outputDir, filename);
      }
      
      // Create directory if needed
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (input.dryRun) {
        skipped.push(`[DRY RUN] Would create: ${targetPath}`);
      } else {
        fs.writeFileSync(targetPath, file.content, 'utf-8');
        applied.push(targetPath);
      }
    } catch (error) {
      failed.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  const summary = input.dryRun
    ? `Dry run complete: ${skipped.length} file(s) would be created`
    : `Applied ${applied.length} file(s)${failed.length > 0 ? `, ${failed.length} failed` : ''}`;
  
  return {
    applied,
    failed,
    skipped,
    summary
  };
}
```
