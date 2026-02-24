/**
 * Message service types (per plans/message-service-improvements.md).
 * Extends Prisma Message model with typed content.
 */

export type ContentType =
  | 'text'
  | 'blocks'
  | 'graph'
  | 'action'
  | 'error'
  | 'system';

export interface MessageContentBase {
  type?: ContentType;
}

export interface TextContent extends MessageContentBase {
  type: 'text';
  text: string;
}

export interface BlocksContent extends MessageContentBase {
  type: 'blocks';
  blocks: unknown[];
}

export type MessageContent = TextContent | BlocksContent | (MessageContentBase & Record<string, unknown>);

export function isTextContent(c: MessageContent): c is TextContent {
  return (c as TextContent).type === 'text' && typeof (c as TextContent).text === 'string';
}

export function isBlocksContent(c: MessageContent): c is BlocksContent {
  return (c as BlocksContent).type === 'blocks' && Array.isArray((c as BlocksContent).blocks);
}
