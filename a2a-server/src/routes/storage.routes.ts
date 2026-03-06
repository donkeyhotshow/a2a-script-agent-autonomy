import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Base storage directory
const STORAGE_DIR = path.join(process.cwd(), 'a2a-client', 'storage');

// Ensure storage directory exists
async function ensureStorageDir(namespace: string): Promise<string> {
    const namespaceDir = path.join(STORAGE_DIR, namespace);
    try {
        await fs.access(namespaceDir);
    } catch {
        await fs.mkdir(namespaceDir, { recursive: true });
    }
    return namespaceDir;
}

// Get storage file path
function getStorageFile(namespace: string, key: string): string {
    return path.join(STORAGE_DIR, namespace, `${key}.json`);
}

// Validate namespace and key
function validateNamespace(namespace: string): boolean {
    // Allow alphanumeric, hyphens, underscores, max 50 chars
    return /^[a-zA-Z0-9_-]{1,50}$/.test(namespace);
}

function validateKey(key: string): boolean {
    // Allow alphanumeric, hyphens, underscores, dots, max 100 chars
    return /^[a-zA-Z0-9_.-]{1,100}$/.test(key);
}

// Validate storage value
function validateValue(value: any): { valid: boolean; error?: string } {
    try {
        // Check size limit (10MB)
        const serialized = JSON.stringify(value);
        if (serialized.length > 10 * 1024 * 1024) {
            return { valid: false, error: 'Value too large (max 10MB)' };
        }

        // Check for circular references
        JSON.stringify(value);
        return { valid: true };
    } catch (error) {
        return { valid: false, error: 'Invalid JSON value' };
    }
}

// Cleanup old storage files (older than 30 days)
async function cleanupOldFiles(): Promise<void> {
    try {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

        const entries = await fs.readdir(STORAGE_DIR, { withFileTypes: true });
        let cleanedCount = 0;

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const namespaceDir = path.join(STORAGE_DIR, entry.name);
            const files = await fs.readdir(namespaceDir);

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(namespaceDir, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    cleanedCount++;
                }
            }

            // Remove empty namespace directories
            try {
                const remainingFiles = await fs.readdir(namespaceDir);
                if (remainingFiles.length === 0) {
                    await fs.rmdir(namespaceDir);
                }
            } catch {
                // Ignore errors when checking for empty directories
            }
        }

        if (cleanedCount > 0) {
            console.log(`[Storage] Cleaned up ${cleanedCount} old files`);
        }
    } catch (error) {
        console.error('[Storage] Cleanup error:', error);
    }
}

// Run cleanup every 24 hours
setInterval(cleanupOldFiles, 24 * 60 * 60 * 1000);

// GET /storage/:namespace/:key - Get item
router.get('/storage/:namespace/:key', authenticate, async (req: Request, res: Response) => {
    try {
        const { namespace, key } = req.params;

        // Validate parameters
        if (!namespace || !key) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_PARAMS', message: 'Namespace and key are required' }
            });
        }

        if (!validateNamespace(namespace)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_NAMESPACE', message: 'Invalid namespace format' }
            });
        }

        if (!validateKey(key)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_KEY', message: 'Invalid key format' }
            });
        }

        const filePath = getStorageFile(namespace, key);

        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);

            // Validate that the parsed data has the expected structure
            if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'CORRUPTED_DATA', message: 'Stored data is corrupted' }
                });
            }

            res.json({
                success: true,
                data: {
                    value: parsed.value,
                    timestamp: parsed.timestamp,
                    updatedAt: parsed.updatedAt,
                    namespace,
                    key
                }
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return res.status(404).json({
                    success: false,
                    error: { code: 'NOT_FOUND', message: 'Item not found' }
                });
            }

            // Handle JSON parsing errors
            if (error instanceof SyntaxError) {
                return res.status(500).json({
                    success: false,
                    error: { code: 'CORRUPTED_DATA', message: 'Stored data is corrupted' }
                });
            }

            throw error;
        }
    } catch (error) {
        console.error('[Storage] Get error:', error);

        // Handle specific filesystem errors
        if (error instanceof Error) {
            if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'ACCESS_DENIED', message: 'Permission denied' }
                });
            }
        }

        res.status(500).json({
            success: false,
            error: { code: 'STORAGE_ERROR', message: 'Failed to get item' }
        });
    }
});

// PUT /storage/:namespace/:key - Set item
router.put('/storage/:namespace/:key', authenticate, async (req: Request, res: Response) => {
    try {
        const { namespace, key } = req.params;
        const { value, timestamp } = req.body;

        // Validate parameters
        if (!namespace || !key) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_PARAMS', message: 'Namespace and key are required' }
            });
        }

        if (!validateNamespace(namespace)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_NAMESPACE', message: 'Invalid namespace format (alphanumeric, hyphens, underscores, max 50 chars)' }
            });
        }

        if (!validateKey(key)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_KEY', message: 'Invalid key format (alphanumeric, hyphens, underscores, dots, max 100 chars)' }
            });
        }

        // Validate value
        const valueValidation = validateValue(value);
        if (!valueValidation.valid) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_VALUE', message: valueValidation.error }
            });
        }

        // Validate timestamp if provided
        if (timestamp && isNaN(Date.parse(timestamp))) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_TIMESTAMP', message: 'Invalid timestamp format' }
            });
        }

        await ensureStorageDir(namespace);

        const filePath = getStorageFile(namespace, key);
        const data = {
            value,
            timestamp: timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

        res.json({
            success: true,
            data: {
                namespace,
                key,
                timestamp: data.timestamp,
                updatedAt: data.updatedAt
            }
        });
    } catch (error) {
        console.error('[Storage] Set error:', error);

        // Handle specific filesystem errors
        if (error instanceof Error) {
            if (error.message.includes('ENOSPC')) {
                return res.status(507).json({
                    success: false,
                    error: { code: 'INSUFFICIENT_STORAGE', message: 'No space left on device' }
                });
            }
            if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'ACCESS_DENIED', message: 'Permission denied' }
                });
            }
        }

        res.status(500).json({
            success: false,
            error: { code: 'STORAGE_ERROR', message: 'Failed to set item' }
        });
    }
});

// DELETE /storage/:namespace/:key - Remove item
router.delete('/storage/:namespace/:key', authenticate, async (req: Request, res: Response) => {
    try {
        const { namespace, key } = req.params;

        // Validate parameters
        if (!namespace || !key) {
            return res.status(400).json({
                success: false,
                error: { code: 'MISSING_PARAMS', message: 'Namespace and key are required' }
            });
        }

        if (!validateNamespace(namespace)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_NAMESPACE', message: 'Invalid namespace format' }
            });
        }

        if (!validateKey(key)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_KEY', message: 'Invalid key format' }
            });
        }

        const filePath = getStorageFile(namespace, key);

        try {
            await fs.unlink(filePath);
            res.json({
                success: true,
                data: { namespace, key, deleted: true }
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return res.json({
                    success: true,
                    data: { namespace, key, deleted: false, message: 'Item did not exist' }
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('[Storage] Remove error:', error);

        // Handle specific filesystem errors
        if (error instanceof Error) {
            if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'ACCESS_DENIED', message: 'Permission denied' }
                });
            }
        }

        res.status(500).json({
            success: false,
            error: { code: 'STORAGE_ERROR', message: 'Failed to remove item' }
        });
    }
});

// DELETE /storage/:namespace - Clear namespace
router.delete('/storage/:namespace', authenticate, async (req: Request, res: Response) => {
    try {
        const { namespace } = req.params;

        if (!validateNamespace(namespace)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: 'Invalid namespace' }
            });
        }

        const namespaceDir = path.join(STORAGE_DIR, namespace);

        try {
            // Remove all files in namespace directory
            const files = await fs.readdir(namespaceDir);
            await Promise.all(
                files
                    .filter(file => file.endsWith('.json'))
                    .map(file => fs.unlink(path.join(namespaceDir, file)))
            );

            res.json({ success: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return res.json({ success: true }); // Directory doesn't exist
            }
            throw error;
        }
    } catch (error) {
        console.error('[Storage] Clear error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'STORAGE_ERROR', message: 'Failed to clear namespace' }
        });
    }
});

// GET /storage/:namespace/keys - Get all keys in namespace
router.get('/storage/:namespace/keys', authenticate, async (req: Request, res: Response) => {
    try {
        const { namespace } = req.params;

        if (!validateNamespace(namespace)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_PARAMS', message: 'Invalid namespace' }
            });
        }

        const namespaceDir = path.join(STORAGE_DIR, namespace);

        try {
            const files = await fs.readdir(namespaceDir);
            const keys = files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));

            res.json({
                success: true,
                data: { keys }
            });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return res.json({
                    success: true,
                    data: { keys: [] }
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('[Storage] Keys error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'STORAGE_ERROR', message: 'Failed to get keys' }
        });
    }
});

export default router;