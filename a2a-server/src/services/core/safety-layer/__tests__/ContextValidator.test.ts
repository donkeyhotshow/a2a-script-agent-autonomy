import { describe, it, expect, beforeEach } from 'vitest';
import { ContextValidator } from '../ContextValidator.js';

describe('ContextValidator', () => {
    let validator: ContextValidator;

    beforeEach(() => {
        validator = new ContextValidator();
    });

    it('should calculate the same hash for identical relevant context parts', () => {
        const ctx1 = {
            execution: { turn: 1 },
            history: [{ msg: 'hello' }],
            workbench: { slots: {} },
            other: 'ignored'
        };
        const ctx2 = {
            execution: { turn: 1 },
            history: [{ msg: 'hello' }],
            workbench: { slots: {} },
            other: 'different but ignored'
        };

        const hash1 = validator.calculateHash(ctx1);
        const hash2 = validator.calculateHash(ctx2);
        
        expect(hash1).toBe(hash2);
    });

    it('should detect changes in workbench', () => {
        const ctx1 = { workbench: { slots: { a: 1 } } };
        const ctx2 = { workbench: { slots: { a: 2 } } };

        const hash1 = validator.calculateHash(ctx1);
        const hash2 = validator.calculateHash(ctx2);
        
        expect(hash1).not.toBe(hash2);
    });

    it('should validate a correct hash', () => {
        const ctx = { workbench: { slots: {} } };
        const hash = validator.calculateHash(ctx);
        
        expect(validator.validate(ctx, hash)).toBe(true);
    });
});
