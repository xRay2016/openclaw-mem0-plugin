# OpenClaw Mem0 Plugin

[中文文档](README_zh.md)

This is an OpenClaw plugin that integrates with [Mem0](https://mem0.ai) to provide long-term memory capabilities for your agents.

It automatically:
- **Search** relevant memories before the agent starts processing a request (`before_agent_start`).
- **Adds** the conversation turn to memory after the agent finishes (`agent_end`).

## Configuration

Set the following environment variables in your OpenClaw environment (e.g., `~/.openclaw/.env`):

- `MEM0_BASE_URL`: Mem0 API Base URL (Required). e.g., `https://api.mem0.ai`
- `MEM0_API_KEY`: Your Mem0 Platform API Key (Required). Get it from the [Mem0 Dashboard](https://app.mem0.ai/).
- `MEM0_USER_ID`: (Optional) The user ID to associate memories with. Defaults to `openclaw-user` or uses `context.userId` if available.

Quick setup:
```bash
echo "MEM0_BASE_URL=https://api.mem0.ai" >> ~/.openclaw/.env
echo "MEM0_API_KEY=your_api_key_here" >> ~/.openclaw/.env
```

## Installation

1.  Install the plugin using OpenClaw CLI:
    ```bash
    openclaw plugins install github:xRay2016/openclaw-mem0-plugin
    ```

2.  Restart the OpenClaw Gateway to apply changes:
    ```bash
    openclaw gateway restart
    ```

## How it Works

- **Search**: Before the agent runs, the plugin takes the user's last message, searches Mem0 for relevant memories, and injects them into the context (prepended to the system prompt or context).
- **Memory**: After the agent responds, the plugin takes the user's message and the assistant's response and saves them to Mem0.

## License

MIT
