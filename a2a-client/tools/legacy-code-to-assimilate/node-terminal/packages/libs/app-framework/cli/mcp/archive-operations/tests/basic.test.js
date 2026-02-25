const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

function runTests() {
    let failed = 0;
    let passed = 0;
    let total = 0;

    describe('Basic File Operations', () => {
        const testDir = path.join(__dirname, 'test-temp');
        
        beforeEach(() => {
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir);
            }
        });

        afterEach(() => {
            if (fs.existsSync(testDir)) {
                fs.rmSync(testDir, { recursive: true });
            }
        });

        test('должен создавать и читать файл', () => {
            const testFile = path.join(testDir, 'test.txt');
            const content = 'test content';

            fs.writeFileSync(testFile, content);
            const readContent = fs.readFileSync(testFile, 'utf8');
            
            try {
                if (readContent !== content) {
                    throw new Error(`Expected ${content}, got ${readContent}`);
                }
                passed++;
            } catch (error) {
                failed++;
                console.error(`Test failed: ${error.message}`);
            }
            total++;
        });
    });

    console.log(`\nTest Results:\nTotal: ${total}\nPassed: ${passed}\nFailed: ${failed}`);
}

runTests();
