import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface ScreenshotComparisonResult {
  testName: string;
  timestamp: string;
  baselinePath: string;
  currentPath: string;
  diffPath: string;
  isMatch: boolean;
  pixelDifference: number;
  totalPixels: number;
  differencePercentage: number;
  threshold: number;
  passed: boolean;
  error?: string;
}

export interface VisualRegressionConfig {
  threshold: number; // 0-1, percentage of pixels that can differ
  baselineDir: string;
  currentDir: string;
  diffDir: string;
  updateBaselines: boolean;
}

export class ScreenshotComparison {
  constructor(private config: VisualRegressionConfig) {
    // Ensure directories exist
    [config.baselineDir, config.currentDir, config.diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async compareScreenshots(
    testName: string,
    screenshotName: string,
    screenshotBuffer: Buffer
  ): Promise<ScreenshotComparisonResult> {
    const timestamp = new Date().toISOString();
    const baseFilename = `${testName}-${screenshotName}`;
    const currentPath = path.join(this.config.currentDir, `${baseFilename}-current.png`);
    const baselinePath = path.join(this.config.baselineDir, `${baseFilename}-baseline.png`);
    const diffPath = path.join(this.config.diffDir, `${baseFilename}-diff.png`);

    // Save current screenshot
    fs.writeFileSync(currentPath, screenshotBuffer);

    const result: ScreenshotComparisonResult = {
      testName,
      timestamp,
      baselinePath,
      currentPath,
      diffPath,
      isMatch: false,
      pixelDifference: 0,
      totalPixels: 0,
      differencePercentage: 0,
      threshold: this.config.threshold,
      passed: false
    };

    try {
      // Check if baseline exists
      if (!fs.existsSync(baselinePath)) {
        if (this.config.updateBaselines) {
          // Create baseline from current screenshot
          fs.copyFileSync(currentPath, baselinePath);
          result.passed = true;
          result.isMatch = true;
          return result;
        } else {
          result.error = `Baseline screenshot not found: ${baselinePath}. Run with updateBaselines=true to create it.`;
          return result;
        }
      }

      // Load both images
      const baselineImage = PNG.sync.read(fs.readFileSync(baselinePath));
      const currentImage = PNG.sync.read(screenshotBuffer);

      // Check dimensions
      if (baselineImage.width !== currentImage.width || baselineImage.height !== currentImage.height) {
        result.error = `Image dimensions don't match. Baseline: ${baselineImage.width}x${baselineImage.height}, Current: ${currentImage.width}x${currentImage.height}`;
        return result;
      }

      // Create diff image
      const diffImage = new PNG({ width: baselineImage.width, height: baselineImage.height });

      // Compare images
      const pixelDifference = pixelmatch(
        baselineImage.data,
        currentImage.data,
        diffImage.data,
        baselineImage.width,
        baselineImage.height,
        { threshold: 0.1 } // Pixel difference threshold
      );

      const totalPixels = baselineImage.width * baselineImage.height;
      const differencePercentage = (pixelDifference / totalPixels) * 100;

      result.pixelDifference = pixelDifference;
      result.totalPixels = totalPixels;
      result.differencePercentage = differencePercentage;
      result.isMatch = differencePercentage <= (this.config.threshold * 100);
      result.passed = result.isMatch;

      // Save diff image if there are differences
      if (pixelDifference > 0) {
        fs.writeFileSync(diffPath, PNG.sync.write(diffImage));
      }

    } catch (error) {
      result.error = `Comparison failed: ${error.message}`;
      result.passed = false;
    }

    return result;
  }

  async compareScreenshotsFromPaths(
    testName: string,
    screenshotName: string,
    currentPath: string
  ): Promise<ScreenshotComparisonResult> {
    const screenshotBuffer = fs.readFileSync(currentPath);
    return this.compareScreenshots(testName, screenshotName, screenshotBuffer);
  }

  getComparisonSummary(results: ScreenshotComparisonResult[]): {
    total: number;
    passed: number;
    failed: number;
    avgDifferencePercentage: number;
    maxDifferencePercentage: number;
    failedTests: string[];
  } {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const differences = results.filter(r => r.passed).map(r => r.differencePercentage);
    const failedTests = results.filter(r => !r.passed).map(r => `${r.testName}-${r.screenshotName}`);

    return {
      total: results.length,
      passed,
      failed,
      avgDifferencePercentage: differences.length > 0 ? differences.reduce((a, b) => a + b, 0) / differences.length : 0,
      maxDifferencePercentage: differences.length > 0 ? Math.max(...differences) : 0,
      failedTests
    };
  }

  updateBaseline(testName: string, screenshotName: string): boolean {
    const baseFilename = `${testName}-${screenshotName}`;
    const currentPath = path.join(this.config.currentDir, `${baseFilename}-current.png`);
    const baselinePath = path.join(this.config.baselineDir, `${baseFilename}-baseline.png`);

    try {
      if (fs.existsSync(currentPath)) {
        fs.copyFileSync(currentPath, baselinePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to update baseline for ${testName}-${screenshotName}:`, error);
      return false;
    }
  }

  cleanupOldDiffs(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // 7 days default
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.config.diffDir);
      for (const file of files) {
        if (file.endsWith('-diff.png')) {
          const filePath = path.join(this.config.diffDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old diff files:', error);
    }

    return deletedCount;
  }

  // Utility method to generate screenshot name from test context
  static generateScreenshotName(browser: string, device: string, state: string): string {
    return `${browser}-${device}-${state}`;
  }

  // Utility method to generate test name from context
  static generateTestName(testTitle: string, browser?: string, device?: string): string {
    let name = testTitle.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    if (browser && device) {
      name += `-${browser}-${device}`;
    }
    return name;
  }
}