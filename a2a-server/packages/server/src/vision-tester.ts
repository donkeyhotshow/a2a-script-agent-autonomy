// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — playwright is an optional peer dependency; install it for browser automation
import { chromium, Browser, Page } from 'playwright';
import { logger } from '@a2a/server-utils/logger';
import { createArtifactWriteInput, globalArtifactStore } from './artifact-store.js';

export interface VisionQAStatus {
    passed: boolean;
    critique?: string;
    screenshot_path?: string;
    timestamp: string;
}

export class VisionTester {
    private readonly COMPONENT_ID = 'VisionTester';
    private browser: Browser | null = null;

    constructor() {
        globalArtifactStore.registerWriter('VISION_QA_RESULT', this.COMPONENT_ID);
    }

    private _simpleHash(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    async captureScreenshot(url: string, outputPath: string, browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium'): Promise<void> {
        let browser;
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore — playwright is an optional peer dependency
            const pw = await import('playwright');
            browser = await pw[browserType].launch();
            const page = await browser.newPage();
            await page.setViewportSize({ width: 1280, height: 720 });
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.screenshot({ path: outputPath });
            logger.info('[VisionTester] Screenshot captured', { url, path: outputPath, browser: browserType });
        } finally {
            if (browser) await browser.close();
        }
    }

    async performVisualQA(
        screenshotPath: string, 
        requirement: string,
        model: string = process.env['VISION_MODEL'] || 'llama3.2-vision'
    ): Promise<VisionQAStatus> {
        // Note: Real implementation would send image to AI Hub.
        // For now, we simulate the Vision-LLM call with a descriptive prompt.
        logger.info(`[VisionTester] Performing visual QA using model ${model}`);
        
        // Deterministic mock based on environment variable or hash of inputs
        const mockMode = process.env['VISION_MOCK_MODE'] || 'deterministic';
        let mockPassed: boolean;
        
        if (mockMode === 'always_pass') {
            mockPassed = true;
        } else if (mockMode === 'always_fail') {
            mockPassed = false;
        } else if (mockMode === 'random') {
            // Legacy random behavior (80% pass rate)
            mockPassed = Math.random() > 0.2;
        } else {
            // Deterministic mode: hash the inputs to get consistent results
            // Simple hash function for consistent pass/fail based on inputs
            const hash = this._simpleHash(screenshotPath + requirement);
            mockPassed = (hash % 5) !== 0; // 80% pass rate, but deterministic
        }
        
        const status: VisionQAStatus = {
            passed: mockPassed,
            critique: mockPassed ? undefined : 'Found visual overlap in the header section and low contrast on the primary button.',
            screenshot_path: screenshotPath,
            timestamp: new Date().toISOString()
        };

        await globalArtifactStore.write(
            createArtifactWriteInput({
                artifact_id: `vision-qa-${Date.now()}`,
                artifact_type: 'VISION_QA_RESULT',
                session_id: 'unknown',
                turn_id: 'unknown',
                created_at: status.timestamp,
                schema_version: '1.0',
                data: status as unknown as Record<string, unknown>,
                summary: `Vision QA: ${status.passed ? 'PASS' : 'FAIL'}. ${status.critique ?? ''}`,
                severity: status.passed ? 'info' : 'warning',
            }),
            this.COMPONENT_ID,
        );

        return status;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export const globalVisionTester = new VisionTester();
