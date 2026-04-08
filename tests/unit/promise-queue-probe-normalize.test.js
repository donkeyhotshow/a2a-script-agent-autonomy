import { describe, expect, it } from 'vitest';
import { normalizeClientHubProbeOrigin } from '../monitor-tasks/promise-queue-probe.mjs';

describe('normalizeClientHubProbeOrigin', () => {
  it('maps localhost to 127.0.0.1 preserving port', () => {
    expect(normalizeClientHubProbeOrigin('http://localhost:5173')).toBe('http://127.0.0.1:5173');
    expect(normalizeClientHubProbeOrigin('http://localhost:5173/')).toBe('http://127.0.0.1:5173');
  });

  it('maps ::1 to 127.0.0.1', () => {
    expect(normalizeClientHubProbeOrigin('http://[::1]:5173')).toBe('http://127.0.0.1:5173');
  });

  it('leaves 127.0.0.1 and other hosts unchanged', () => {
    expect(normalizeClientHubProbeOrigin('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173');
    expect(normalizeClientHubProbeOrigin('http://example.com:5173')).toBe('http://example.com:5173');
  });

  it('returns empty for empty input', () => {
    expect(normalizeClientHubProbeOrigin('')).toBe('');
  });
});
