/**
 * Invoke Service
 * Parses context and creates requests. Routes → services; protocol used here.
 */

import { parseContextBlock } from '../protocol/context-parser.js';
import type { ContextBlock, FileBlock } from '../types/index.js';
import { requestService } from './request.service.js';

export interface InvokeInput {
  context?: unknown;
  message?: string;
  code_blocks?: FileBlock[];
}

export interface InvokeResult {
  promiseId: string;
}

export async function invoke(clientId: string, input: InvokeInput): Promise<InvokeResult> {
  let context: ContextBlock;
  if (input.context) {
    context = parseContextBlock(input.context);
  } else {
    context = {
      version: '1.0',
      session_id: 'stateless',
    };
  }

  const { promiseId } = await requestService.create({
    clientId,
    context: context as Record<string, unknown>,
    message: input.message,
    codeBlocks: input.code_blocks ?? undefined,
  });

  return { promiseId };
}
