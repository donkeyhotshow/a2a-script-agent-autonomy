/** File block encoding (e.g. base64 for binary). */

export function encodeFileContent(content: string, binary: boolean): string {
  if (binary) return Buffer.from(content, 'utf8').toString('base64');
  return content;
}

export function decodeFileContent(content: string, binary: boolean): string {
  if (binary) return Buffer.from(content, 'base64').toString('utf8');
  return content;
}

export function isBase64(str: string): boolean {
  return /^[A-Za-z0-9+/]+=*$/.test(str) && str.length % 4 === 0;
}
