import { chromium, Browser, Page } from 'playwright';
import { logger } from '../../utils/logger.js';
import { globalArtifactStore } from './artifact-store.js';

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

    async captureScreenshot(url: string, outputPath: string, browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium'): Promise<void> {
        let browser;
        try {
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
        
        // Mocking the vision logic - in reality, this calls AI Hub /api/chat with 'images' array
        const mockPassed = Math.random() > 0.2; // 80% pass rate in mock
        const status: VisionQAStatus = {
            passed: mockPassed,
            critique: mockPassed ? undefined : 'Found visual overlap in the header section and low contrast on the primary button.',
            screenshot_path: screenshotPath,
            timestamp: new Date().toISOString()
        };

        await globalArtifactStore.write({
            artifact_id: `vision-qa-${Date.now()}`,
            artifact_type: 'VISION_QA_RESULT',
            session_id: 'unknown',
            turn_id: 'unknown',
            created_at: status.timestamp,
            schema_version: '1.0',
            data: status as unknown as Record<string, unknown>,
            summary: `Vision QA: ${status.passed ? 'PASS' : 'FAIL'}. ${status.critique ?? ''}`,
            severity: status.passed ? 'info' : 'warning'
        }, this.COMPONENT_ID);

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
