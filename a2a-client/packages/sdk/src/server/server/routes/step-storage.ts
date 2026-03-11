/**
 * Step Storage Routes
 * 
 * Routes for step-based storage that bypass authentication.
 * These handle files in storage/sessions/{sessionId}/{step}/
 */

import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const router = Router();

// Get storage directory - use A2A_CLIENT_STORAGE_DIR or default to local storage
function getStorageDir(): string {
    if (process.env.A2A_CLIENT_STORAGE_DIR) return process.env.A2A_CLIENT_STORAGE_DIR;
    // Default to local storage in project for web client compatibility
    return path.join(process.cwd(), '..', 'storage');
}

function getStepDir(sessionId: string, stepNum: number): string {
    return path.join(getStorageDir(), 'sessions', sessionId, String(stepNum));
}

/**
 * GET /:sessionId/step/:stepNum/:file
 * Get step file (server-promise.json, client-result.json, request-to-server.json, server-response.json, messages.json)
 */
router.get('/:sessionId/step/:stepNum/:file', async (req: Request, res: Response) => {
    try {
        const { sessionId, stepNum, file } = req.params;
        const stepDir = getStepDir(sessionId, Number(stepNum));
        const validFiles = ['server-promise.json', 'client-result.json', 'request-to-server.json', 'server-response.json', 'messages.json'];
        
        if (!validFiles.includes(file)) {
            res.status(400).json({ error: 'Invalid file name' });
            return;
        }
        
        const filePath = path.join(stepDir, file);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            res.json(JSON.parse(content));
        } catch (err: unknown) {
            if ((err as { code?: string })?.code === 'ENOENT') {
                res.status(404).json({ error: 'File not found' });
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('[STEP STORAGE] Error reading step file:', error);
        res.status(500).json({ error: 'Failed to read step file' });
    }
});

/**
 * PUT /:sessionId/step/:stepNum/:file
 * Save step file
 */
router.put('/:sessionId/step/:stepNum/:file', async (req: Request, res: Response) => {
    try {
        const { sessionId, stepNum, file } = req.params;
        const stepDir = getStepDir(sessionId, Number(stepNum));
        const validFiles = ['server-promise.json', 'client-result.json', 'request-to-server.json', 'server-response.json', 'messages.json'];
        
        if (!validFiles.includes(file)) {
            res.status(400).json({ error: 'Invalid file name' });
            return;
        }
        
        await fs.mkdir(stepDir, { recursive: true });
        const filePath = path.join(stepDir, file);
        await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ success: true });
    } catch (error) {
        console.error('[STEP STORAGE] Error saving step file:', error);
        res.status(500).json({ error: 'Failed to save step file' });
    }
});

/**
 * GET /:sessionId/history/:fromStep
 * Get session history from a specific step
 */
router.get('/:sessionId/history/:fromStep', async (req: Request, res: Response) => {
    try {
        const { sessionId, fromStep } = req.params;
        const startStep = Number(fromStep);
        const sessionDir = path.join(getStorageDir(), 'sessions', sessionId);
        
        const messages: Array<{step: number; content: unknown}> = [];
        
        // Read all step directories from startStep
        let step = startStep;
        while (true) {
            const stepDir = path.join(sessionDir, String(step));
            const messagesFile = path.join(stepDir, 'messages.json');
            try {
                const content = await fs.readFile(messagesFile, 'utf-8');
                const stepMessages = JSON.parse(content);
                messages.push({ step, content: stepMessages });
            } catch (err: unknown) {
                if ((err as { code?: string })?.code === 'ENOENT') {
                    break; // No more steps
                }
                throw err;
            }
            step++;
        }
        
        res.json({ history: messages });
    } catch (error) {
        console.error('[STEP STORAGE] Error getting history:', error);
        res.status(500).json({ error: 'Failed to get session history' });
    }
});

/**
 * GET /:sessionId/latest
 * Get latest step data
 */
router.get('/:sessionId/latest', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const sessionDir = path.join(getStorageDir(), 'sessions', sessionId);
        
        // Find the highest step number
        let latestStep = 0;
        try {
            const entries = await fs.readdir(sessionDir);
            for (const entry of entries) {
                const num = Number(entry);
                if (!isNaN(num) && num > latestStep) {
                    latestStep = num;
                }
            }
        } catch (err: unknown) {
            if ((err as { code?: string })?.code !== 'ENOENT') throw err;
        }
        
        if (latestStep === 0) {
            res.status(404).json({ error: 'No steps found' });
            return;
        }
        
        const stepDir = path.join(sessionDir, String(latestStep));
        const result: Record<string, unknown> = { step: latestStep };
        
        // Try to read various files
        const files = ['server-response.json', 'messages.json', 'execute.json'];
        for (const file of files) {
            try {
                const filePath = path.join(stepDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const key = file.replace('.json', '');
                result[key] = JSON.parse(content);
            } catch {
                // File doesn't exist, skip
            }
        }
        
        res.json(result);
    } catch (error) {
        console.error('[STEP STORAGE] Error getting latest step:', error);
        res.status(500).json({ error: 'Failed to get latest step' });
    }
});

export const stepStorageRoutes = router;
