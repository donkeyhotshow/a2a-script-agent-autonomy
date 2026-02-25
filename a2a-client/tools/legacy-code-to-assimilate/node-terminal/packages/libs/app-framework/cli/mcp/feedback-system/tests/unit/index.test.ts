import * as index from '../../src/index';
import { FeedbackPlugin } from '../../src/FeedbackPlugin';
import { FeedbackTools } from '../../src/FeedbackTools';

describe('index.ts exports', () => {
    it('should export FeedbackPlugin', () => {
        expect(index.FeedbackPlugin).toBe(FeedbackPlugin);
    });

    it('should export FeedbackTools', () => {
        expect(index.FeedbackTools).toBe(FeedbackTools);
    });
});
