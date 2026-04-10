import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('step-handlers error contract', () => {
    it('does not report success=true when returning error payloads', () => {
        const filePath = path.resolve(process.cwd(), 'vite-plugin-a2a/routes/handlers/step-handlers.js');
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.includes('success: true, error:')).toBe(false);
    });
});
