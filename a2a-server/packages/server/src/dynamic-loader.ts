import { glob } from 'glob';

// Mock Tool interface
export interface Tool {
  name: string;
  description: string;
  execute: (params: unknown) => Promise<unknown>;
}

export async function loadCustomTools(): Promise<Tool[]> {
  const files = await glob('./tools/custom/*.ts');
  const tools = await Promise.all(
    files.map(async (file) => {
      const mod = await import(file);
      return mod.default || mod.tool;
    })
  );
  return tools.filter(Boolean);
}
