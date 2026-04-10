import { describe, it, expect, beforeEach } from 'vitest';
import { LoopDetector } from '../LoopDetector.js';

describe('LoopDetector', () => {
    let detector: LoopDetector;

    beforeEach(() => {
        detector = new LoopDetector();
    });

    it('should not detect a loop on the first call', () => {
        const signal = detector.detect('read-file:a.ts', 'success', { data: 1 });
        expect(signal).toBeNull();
    });

    it('should detect a moderate loop after 3 repetitions', () => {
        detector.detect('read-file:a.ts', 'success', { data: 1 });
        detector.detect('read-file:a.ts', 'success', { data: 1 });
        const signal = detector.detect('read-file:a.ts', 'success', { data: 1 });
        
        expect(signal).not.toBeNull();
        expect(signal?.severity).toBe('moderate');
        expect(signal?.count).toBe(3);
    });

    it('should detect a critical loop after 5 repetitions', () => {
        for (let i = 0; i < 4; i++) {
            detector.detect('read-file:a.ts', 'success', { data: 1 });
        }
        const signal = detector.detect('read-file:a.ts', 'success', { data: 1 });
        
        expect(signal).not.toBeNull();
        expect(signal?.severity).toBe('critical');
        expect(signal?.count).toBe(5);
    });

    it('should distinguish loops by context hash', () => {
        detector.detect('read-file:a.ts', 'success', { data: 1 });
        detector.detect('read-file:a.ts', 'success', { data: 1 });
        // Different context data should result in a different hash
        const signal = detector.detect('read-file:a.ts', 'success', { data: 2 });
        
        expect(signal).toBeNull();
    });
});
