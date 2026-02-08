import { jest } from '@jest/globals';
import Mem0Client, { buildConfig } from '../lib/mem0-api.js';

// Mock fetch
global.fetch = jest.fn();

// Mock process.env
const originalEnv = process.env;

describe('Mem0Client', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    fetch.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error if apiKey is missing', () => {
      delete process.env.MEM0_API_KEY;
      expect(() => new Mem0Client()).toThrow('Mem0 API Key is required');
    });

    it('should use provided options over defaults', () => {
      const client = new Mem0Client({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api/v1',
        userId: 'custom-user'
      });

      expect(client.apiKey).toBe('test-key');
      expect(client.baseUrl).toBe('https://custom.api/v1');
      expect(client.userId).toBe('custom-user');
    });
  });

  describe('search', () => {
    it('should make a correct search request (v2 default) and return normalized results', async () => {
      const client = new Mem0Client({ apiKey: 'test-key', baseUrl: 'https://api.mem0.ai', apiVersion: 'v2' });
      const mockResponse = { results: [{ id: '1', memory: 'test' }] };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await client.search('hello');

      // ... assertions ...
      expect(result).toEqual(mockResponse.results);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/search/',
        expect.objectContaining({
          method: 'POST',
          // ...
        })
      );
    });
  });

  it('should handle API errors', async () => {
    const client = new Mem0Client({ apiKey: 'test-key', baseUrl: 'https://api.mem0.ai' });

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Invalid API Key'
    });

    await expect(client.search('hello')).rejects.toThrow('Mem0 API Error: 401 Unauthorized - Invalid API Key');
  });
});

describe('add', () => {
  it('should make a correct add request', async () => {
    const client = new Mem0Client({ apiKey: 'test-key', userId: 'user-1', baseUrl: 'https://api.mem0.ai', apiVersion: 'v2' });
    const messages = [{ role: 'user', content: 'hi' }];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await client.add(messages);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.mem0.ai/v1/memories/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          messages,
          user_id: 'user-1'
        })
      }));
  });
});

describe('buildConfig', () => {
  it('should return default values when config is empty', () => {
    delete process.env.MEM0_API_KEY;
    const config = buildConfig({});

    expect(config.searchEnabled).toBe(true);
    expect(config.addEnabled).toBe(true);
    expect(config.userId).toBe('openclaw-user');
    expect(config.baseUrl).toBe('https://api.mem0.ai');
  });

  it('should prioritize plugin config over env vars', () => {
    process.env.MEM0_API_KEY = 'env-key';
    const config = buildConfig({ apiKey: 'config-key' });
    expect(config.apiKey).toBe('config-key');
  });
});
