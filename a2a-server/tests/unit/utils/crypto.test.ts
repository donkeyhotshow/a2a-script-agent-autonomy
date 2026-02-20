import { describe, it, expect } from 'vitest';
import {
  hashSha256,
  generateHmac,
  verifyHmac,
  constantTimeCompare,
  encrypt,
  decrypt,
  generateRandomString,
  generateApiKey,
  hashPassword,
  verifyPassword,
} from '../../../src/utils/crypto.js';

describe('crypto', () => {
  describe('hashSha256', () => {
    it('returns hex digest', () => {
      const h = hashSha256('hello');
      expect(h).toMatch(/^[a-f0-9]{64}$/);
      expect(hashSha256('hello')).toBe(h);
    });
    it('different input yields different hash', () => {
      expect(hashSha256('a')).not.toBe(hashSha256('b'));
    });
  });

  describe('generateHmac / verifyHmac', () => {
    it('generates and verifies', () => {
      const data = 'payload';
      const hmac = generateHmac(data);
      expect(verifyHmac(data, hmac)).toBe(true);
    });
    it('rejects tampered data', () => {
      const hmac = generateHmac('original');
      expect(verifyHmac('tampered', hmac)).toBe(false);
    });
    it('rejects wrong hmac', () => {
      expect(verifyHmac('data', 'wrong')).toBe(false);
    });
  });

  describe('constantTimeCompare', () => {
    it('returns true for equal strings', () => {
      expect(constantTimeCompare('abc', 'abc')).toBe(true);
    });
    it('returns false for different strings', () => {
      expect(constantTimeCompare('abc', 'abd')).toBe(false);
    });
    it('returns false for different lengths', () => {
      expect(constantTimeCompare('ab', 'abc')).toBe(false);
    });
  });

  describe('encrypt / decrypt', () => {
    it('round-trips', () => {
      const plain = 'secret-ssh-key';
      const enc = encrypt(plain);
      expect(enc).not.toBe(plain);
      expect(decrypt(enc)).toBe(plain);
    });
    it('produces different ciphertext each time (IV)', () => {
      const enc1 = encrypt('x');
      const enc2 = encrypt('x');
      expect(enc1).not.toBe(enc2);
      expect(decrypt(enc1)).toBe('x');
      expect(decrypt(enc2)).toBe('x');
    });
  });

  describe('generateRandomString', () => {
    it('returns requested length', () => {
      expect(generateRandomString(16).length).toBe(16);
    });
  });

  describe('generateApiKey', () => {
    it('starts with prefix', () => {
      expect(generateApiKey()).toMatch(/^sk_a2a_[a-f0-9]{32}$/);
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('hashes and verifies', async () => {
      const h = await hashPassword('Pass1');
      expect(await verifyPassword('Pass1', h)).toBe(true);
      expect(await verifyPassword('wrong', h)).toBe(false);
    });
  });
});
