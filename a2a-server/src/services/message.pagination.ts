/** Cursor-based pagination for messages. */

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(offset: number, limit: number): string {
  return Buffer.from(JSON.stringify({ offset, limit }), 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { offset: number; limit: number } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const o = JSON.parse(raw) as { offset?: number; limit?: number };
    if (typeof o.offset !== 'number' || typeof o.limit !== 'number') return null;
    return { offset: o.offset, limit: o.limit };
  } catch {
    return null;
  }
}

export function pageSlice<T>(items: T[], cursor: string | null, limit: number): PageResult<T> {
  const decoded = cursor ? decodeCursor(cursor) : null;
  const offset = decoded?.offset ?? 0;
  const slice = items.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  const hasMore = nextOffset < items.length;
  const nextCursor = hasMore ? encodeCursor(nextOffset, limit) : null;
  return { items: slice, nextCursor, hasMore };
}

