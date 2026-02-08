import { join } from 'path';
import { homedir } from 'os';
import fs from 'fs';
import dotenv from 'dotenv';

const ENV_SOURCES = [
    { name: "openclaw", path: join(homedir(), ".openclaw", ".env") },
    { name: "moltbot", path: join(homedir(), ".moltbot", ".env") },
    { name: "clawdbot", path: join(homedir(), ".clawdbot", ".env") },
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

// Load environment variables immediately
loadEnv();


export const buildConfig = (pluginConfig) => {
    return {
        searchEnabled: pluginConfig?.searchEnabled ?? true,
        addEnabled: pluginConfig?.addEnabled ?? true,
        apiKey: pluginConfig?.apiKey || process.env.MEM0_API_KEY,
        userId: pluginConfig?.userId || process.env.MEM0_USER_ID || 'openclaw-user',
        baseUrl: pluginConfig?.baseUrl || process.env.MEM0_BASE_URL || 'https://api.mem0.ai',
    };
};



class Mem0Client {
    constructor(options = {}) {
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl;
        this.userId = options.userId;

        if (!this.apiKey) {
            throw new Error('Mem0 API Key is required');
        }
    }

    async _request(endpoint, method, body) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Mem0 API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[Mem0Client] Request failed: ${error.message}`);
            throw error;
        }
    }

    /**
   * Search for memories
   * @param {string} query - The search query
   * @param {Object} options - Additional options (user_id, etc.)
   */
    async search(query, options = {}) {
        const payload = {
            query,
            user_id: this.userId,
            ...options
        };

        // Handle different API versions
        let endpoint = '/v1/memories/search/';

        const response = await this._request(endpoint, 'POST', payload);
        // Normalize response: v2 returns { results: [...] }, v1 might return [...]
        if (response && response.results && Array.isArray(response.results)) {
            return response.results;
        }
        return response;
    }

    /**
     * Add memories
     * @param {Array|string} messages - Array of messages or text content
     * @param {Object} options - Additional options (user_id, etc.)
     */
    async add(messages, options = {}) {
        const payload = {
            messages,
            user_id: this.userId,
            ...options
        };

        let endpoint = '/v1/memories/';

        return this._request(endpoint, 'POST', payload);
    }
}

export default Mem0Client;
