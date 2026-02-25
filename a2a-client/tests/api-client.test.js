/**
 * ApiClient unit tests
 */
const { ApiClient, ApiError } = require('../packages/api-client/dist/index.js');

describe('ApiClient', () => {
  it('constructs with default serverUrl', () => {
    const client = new ApiClient({});
    expect(client.serverUrl).toBe('http://localhost:3000/api/v1');
  });

  it('normalizes serverUrl trailing slash', () => {
    const client = new ApiClient({ serverUrl: 'http://test/api/v1/' });
    expect(client.serverUrl).toBe('http://test/api/v1');
  });

  it('has session methods only', () => {
    const client = new ApiClient({ serverUrl: 'http://localhost:9999' });
    expect(typeof client.createSession).toBe('function');
    expect(typeof client.createCard).toBe('function');
    expect(typeof client.reportCommands).toBe('function');
    expect(typeof client.answerQuestions).toBe('function');
  });

  it('ApiError has status and data', () => {
    const err = new ApiError('test', 404, { code: 'NOT_FOUND' });
    expect(err.message).toBe('test');
    expect(err.status).toBe(404);
    expect(err.data).toEqual({ code: 'NOT_FOUND' });
  });
});
