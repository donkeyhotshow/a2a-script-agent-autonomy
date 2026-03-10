import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { getStorageDir } from '../../services/storage.js';

const router = Router();
const KV_ROOT = path.join(getStorageDir(), 'kv');
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

function isSafeSegment(value?: string): value is string {
    return typeof value === 'string' && SAFE_SEGMENT.test(value);
}

async function ensureNamespaceDir(namespace: string): Promise<string> {
    const dir = path.join(KV_ROOT, namespace);
    await fs.mkdir(dir, { recursive: true });
    return dir;
}

function getKeyFilePath(namespaceDir: string, key: string): string {
    return path.join(namespaceDir, `${key}.json`);
}

function normalizePayload(raw: unknown): Record<string, unknown> {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        if ('value' in raw) {
            return raw as Record<string, unknown>;
        }
        return { ...(raw as Record<string, unknown>), value: raw };
    }
    return { value: raw };
}

async function readKeyFile(filePath: string): Promise<Record<string, unknown>> {
    const text = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(text);
    return normalizePayload(parsed);
}

router.get('/:namespace/keys', async (req: Request, res: Response) => {
    const { namespace } = req.params;
    if (!isSafeSegment(namespace)) {
        return res.status(400).json({ error: 'Invalid namespace' });
    }

    try {
        const namespaceDir = await ensureNamespaceDir(namespace);
        const entries = await fs.readdir(namespaceDir);
        const keys = entries
            .filter((name) => name.endsWith('.json'))
            .map((name) => name.replace(/\.json$/, ''));
        return res.json({ keys });
    } catch (error) {
        console.error('[STORAGE] Failed to list keys:', error);
        return res.status(500).json({ error: 'Failed to list keys' });
    }
});

router.get('/:namespace/:key', async (req: Request, res: Response) => {
    const { namespace, key } = req.params;
    if (!isSafeSegment(namespace) || !isSafeSegment(key)) {
        return res.status(400).json({ error: 'Invalid namespace or key' });
    }

    try {
        const namespaceDir = await ensureNamespaceDir(namespace);
        const filePath = getKeyFilePath(namespaceDir, key);
        const payload = await readKeyFile(filePath);
        return res.json(payload);
    } catch (error: unknown) {
        if ((error as { code?: string })?.code === 'ENOENT') {
            return res.status(404).json({ error: 'Key not found' });
        }
        console.error('[STORAGE] Failed to read key:', error);
        return res.status(500).json({ error: 'Failed to read key' });
    }
});

router.put('/:namespace/:key', async (req: Request, res: Response) => {
    const { namespace, key } = req.params;
    if (!isSafeSegment(namespace) || !isSafeSegment(key)) {
        return res.status(400).json({ error: 'Invalid namespace or key' });
    }

    try {
        const namespaceDir = await ensureNamespaceDir(namespace);
        const filePath = getKeyFilePath(namespaceDir, key);
        await fs.writeFile(filePath, JSON.stringify(req.body ?? {}, null, 2), 'utf-8');
        return res.json({ success: true });
    } catch (error) {
        console.error('[STORAGE] Failed to write key:', error);
        return res.status(500).json({ error: 'Failed to save key' });
    }
});

router.delete('/:namespace/:key', async (req: Request, res: Response) => {
    const { namespace, key } = req.params;
    if (!isSafeSegment(namespace) || !isSafeSegment(key)) {
        return res.status(400).json({ error: 'Invalid namespace or key' });
    }

    try {
        const namespaceDir = await ensureNamespaceDir(namespace);
        const filePath = getKeyFilePath(namespaceDir, key);
        await fs.unlink(filePath);
        return res.json({ success: true });
    } catch (error: unknown) {
        if ((error as { code?: string })?.code === 'ENOENT') {
            return res.status(404).json({ error: 'Key not found' });
        }
        console.error('[STORAGE] Failed to delete key:', error);
        return res.status(500).json({ error: 'Failed to delete key' });
    }
});

router.delete('/:namespace', async (req: Request, res: Response) => {
    const { namespace } = req.params;
    if (!isSafeSegment(namespace)) {
        return res.status(400).json({ error: 'Invalid namespace' });
    }

    try {
        const namespaceDir = await ensureNamespaceDir(namespace);
        await fs.rm(namespaceDir, { recursive: true, force: true });
        return res.json({ success: true });
    } catch (error) {
        console.error('[STORAGE] Failed to clear namespace:', error);
        return res.status(500).json({ error: 'Failed to clear namespace' });
    }
});

export const storageRoutes = router;
