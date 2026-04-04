import { llmService } from './llm-service.js';
import { logger } from '../../utils/logger.js';

export interface BugFixPatch {
  file: string;
  original: string;
  replacement: string;
}

export interface BugFixResult {
  fixed: boolean;
  patches: BugFixPatch[];
  analysis: string;
}

export class BugFixer {
  async fix(failedCode: string, error: string): Promise<BugFixResult> {
    logger.info('[BugFixer] Analyzing failure...');

    const response = await llmService.chat({
      messages: [
        { role: 'system', content: 'You are an advanced bug fixer. Analyze the code and error. Identify the bug and provide patches. Output JSON: { "fixed": boolean, "patches": [{ "file": "...", "original": "...", "replacement": "..." }], "analysis": "..." }' },
        { role: 'user', content: `Code:\n${failedCode}\n\nError:\n${error}` }
      ]
    });

    try {
      return JSON.parse(response.content) as BugFixResult;
    } catch (e) {
      return { fixed: false, patches: [], analysis: 'Failed to parse fix result' };
    }
  }
}

export const bugFixer = new BugFixer();
