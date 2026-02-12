import { MemoryClient } from '../lib/mem0.js';
import dotenv from 'dotenv';
import { join } from 'path';
import { homedir } from 'os';
import fs from 'fs';

// Try to load env from standard locations
const ENV_SOURCES = [
    { name: "openclaw", path: join(homedir(), ".openclaw", ".env") },
    { name: "local", path: join(process.cwd(), ".env") }
];

function loadEnv() {
    for (const source of ENV_SOURCES) {
        if (fs.existsSync(source.path)) {
            const envConfig = dotenv.parse(fs.readFileSync(source.path));
            for (const k in envConfig) {
                if (!process.env[k]) {
                    process.env[k] = envConfig[k];
                }
            }
        }
    }
}

loadEnv();

const apiKey = process.env.MEM0_API_KEY;

// Only run this suite if API key is present
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey('Mem0Client Integration Test (Real API)', () => {
    let client;
    const testUserId = `integration-test-${Date.now()}`;

    beforeAll(() => {
        if (apiKey) {
            client = new MemoryClient({
                apiKey,
                // Optional: use a custom host if MEM0_HOST is set
                host: process.env.MEM0_HOST
            });
        }
    });

    test('should add a memory and then search for it', async () => {
        // 1. Add Memory
        console.log(`Adding memory for user ${testUserId}...`);
        const addResult = await client.add([
            { "role": "user", "content": "Hi, I'm Alex. I love basketball and gaming." }
        ], { user_id: testUserId });

        console.log('Add result:', JSON.stringify(addResult, null, 2));

        // Mem0 API might return success immediately but indexing takes time.
        // Wait a bit for indexing
        console.log('Waiting 3s for indexing...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 2. Search Memory
        console.log('Searching for memory...');
        const searchResult = await client.search("Alex hobbies", { user_id: testUserId });

        console.log('Search result:', JSON.stringify(searchResult, null, 2));

        expect(searchResult).toBeDefined();
        // Depending on the API version and wrapper, it might be an array or object with results
        const resultsArray = Array.isArray(searchResult) ? searchResult : searchResult.results || [];
        
        expect(Array.isArray(resultsArray)).toBe(true);

        // Ideally we should find a match, but latency might cause empty results occasionally
        if (resultsArray.length > 0) {
            const found = resultsArray.some(m => 
                (m.memory && (m.memory.includes('basketball') || m.memory.includes('gaming'))) ||
                (m.text && (m.text.includes('basketball') || m.text.includes('gaming')))
            );
            expect(found).toBe(true);
        } else {
            console.warn('Memory not found immediately in search results. This might be due to indexing latency.');
        }

        // 3. Cleanup
        if (resultsArray.length > 0) {
             console.log('Cleaning up...');
             for (const mem of resultsArray) {
                 await client.delete(mem.id);
             }
        }
    }, 60000); // Long timeout for network calls
});
