import Mem0Client, { buildConfig } from './lib/mem0-api.js';

const formatMemories = (memories) => {
  if (!memories || memories.length === 0) return '';
  const memoryText = memories.map(m => `- ${m.memory}`).join('\n');
  return `\n<relevant_memories>\n${memoryText}\n</relevant_memories>\n`;
};

const extractText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text)
      .join('\n');
  }
  return String(content || '');
};

const plugin = {
  id: "openclaw-mem0-plugin",
  name: "openclaw-mem0-plugin",
  description: "Mem0 memory via lifecycle hooks",

  register(api) {
    const cfg = buildConfig(api.pluginConfig);
    const log = api.logger ?? console;

    // Initialize client once or per request? 
    // Since config can change, maybe per request or reuse if config is static.
    // Here we'll create a helper to get client based on current cfg
    const getClient = () => {
      try {
        return new Mem0Client({
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl,
          userId: cfg.userId
        });
      } catch (error) {
        log.warn?.(`[openclaw-mem0] Client init failed: ${error.message}`);
        return null;
      }
    };

    api.on("before_agent_start", async (event, ctx) => {
      if (!cfg.searchEnabled) return;

      // Check for prompt existence (event.prompt or event.messages)
      // OpenClaw passes `prompt` string in some versions, or we derive from messages
      const rawPrompt = event.prompt || ctx.messages?.findLast(m => m.role === 'user')?.content;
      const userPrompt = extractText(rawPrompt);

      if (!userPrompt || userPrompt.length < 2) return;

      const client = getClient();
      if (!client) {
        log.warn?.("[openclaw-mem0] Missing API Key for recall");
        return;
      }

      try {
        // Use configured userId or context userId
        const userId = ctx.userId || cfg.userId || 'default-user';

        const searchResults = await client.search(userPrompt, { user_id: userId });

        if (searchResults && searchResults.length > 0) {
          const promptBlock = formatMemories(searchResults);
          log.info?.(`[openclaw-mem0] Injected ${searchResults.length} memories`);

          return {
            prependContext: promptBlock,
          };
        }
      } catch (err) {
        log.warn?.(`[openclaw-mem0] recall failed: ${String(err)}`);
      }
    });

    api.on("agent_end", async (event, ctx) => {
      if (!cfg.addEnabled) return;
      // event.success might be boolean, messages is array
      if (event.success === false || !event.messages?.length) return;

      const client = getClient();
      if (!client) {
        log.warn?.("[openclaw-mem0] Missing API Key for add");
        return;
      }

      try {
        const userId = ctx.userId || cfg.userId || 'default-user';
        const messages = event.messages;

        const lastUserMsg = messages.findLast(m => m.role === 'user');
        const lastAssistantMsg = messages.findLast(m => m.role === 'assistant');

        if (lastUserMsg && lastAssistantMsg) {
          const memoryContent = [
            { role: 'user', content: extractText(lastUserMsg.content) },
            { role: 'assistant', content: extractText(lastAssistantMsg.content) }
          ];

          await client.add(memoryContent, { user_id: userId });
          log.info?.('[openclaw-mem0] Added interactions to memory.');
        }
      } catch (err) {
        log.warn?.(`[openclaw-mem0] add failed: ${String(err)}`);
      }
    });
  }
};

export default plugin;
