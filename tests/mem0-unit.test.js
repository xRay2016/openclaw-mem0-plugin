import { jest } from '@jest/globals';
import { MemoryClient } from '../lib/mem0.js';

// Mock fetch
global.fetch = jest.fn();

describe('MemoryClient', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('constructor', () => {
    it('should throw error if apiKey is missing', () => {
      expect(() => new MemoryClient({})).toThrow('Mem0 API key is required');
    });

    it('should initialize with provided options', () => {
      const client = new MemoryClient({
        apiKey: 'test-key',
        host: 'https://custom.api/v1',
        organizationId: 'org-123',
        projectId: 'proj-456'
      });

      expect(client['apiKey']).toBe('test-key');
      expect(client['host']).toBe('https://custom.api/v1');
      expect(client['organizationId']).toBe('org-123');
      expect(client['projectId']).toBe('proj-456');
    });
  });

  describe('search', () => {
    it('should make a correct search request', async () => {
      const client = new MemoryClient({ apiKey: 'test-key' });
      // Mock search response directly (no ping in new impl)
      fetch
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([{ id: '1', memory: 'test' }]) }); // search

      const result = await client.search('hello');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/search/',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Token test-key',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ query: 'hello' })
        })
      );
      expect(result).toEqual([{ id: '1', memory: 'test' }]);
    });
  });

  describe('add', () => {
    it('should make a correct add request', async () => {
      const client = new MemoryClient({ apiKey: 'test-key', organizationId: 'org-1', projectId: 'proj-1' });
      const messages = [{ role: 'user', content: 'hi' }];

      // Mock add response directly (no ping in new impl)
      fetch
        .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ success: true }) }); // add

      await client.add(messages);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.mem0.ai/v1/memories/',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            messages,
            org_id: 'org-1',
            project_id: 'proj-1'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors', async () => {
      const client = new MemoryClient({ apiKey: 'test-key' });

      // Mock add failure directly (no ping in new impl)
      fetch
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Invalid API Key'
        });

      await expect(client.add([])).rejects.toThrow('API request failed: Invalid API Key');
    });
  });
});
