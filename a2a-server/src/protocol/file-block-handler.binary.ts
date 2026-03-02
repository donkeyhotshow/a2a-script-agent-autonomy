/** Binary file block detection and handling. */

const BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
]);

export function isBinaryPath(path: string): boolean {
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
}

export function getBinaryMime(path: string): string {
    const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
    const mime: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
    };
    return mime[ext] ?? 'application/octet-stream';
}

