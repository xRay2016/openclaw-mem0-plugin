# OpenClaw Mem0 Plugin

This is an OpenClaw plugin that integrates with [Mem0](https://mem0.ai) to provide long-term memory capabilities for your agents.

It automatically:
- **Recalls** relevant memories before the agent starts processing a request (`before_agent_start`).
- **Adds** the conversation turn to memory after the agent finishes (`agent_end`).

## Installation

1.  Navigate to your OpenClaw plugins directory or install via `npm`.
    ```bash
    npm install openclaw-mem0-plugin
    ```
    (Or clone this repository into your plugins folder)

2.  Add to your `openclaw.json` (or `config.json`):
    ```json
    {
      "plugins": {
        "entries": {
          "openclaw-mem0-plugin": { "enabled": true }
        }
      }
    }
    ```

## Configuration

Set the following environment variables in your OpenClaw environment (e.g., `.env`):

- `MEM0_API_KEY`: Your Mem0 Platform API Key (Required). Get it from the [Mem0 Dashboard](https://app.mem0.ai/).
- `MEM0_USER_ID`: (Optional) The user ID to associate memories with. Defaults to `default-user` or uses `context.userId` if available.

## How it Works

- **Recall**: Before the agent runs, the plugin takes the user's last message, searches Mem0 for relevant memories, and injects them into the context (prepended to the system prompt or context).
- **Memory**: After the agent responds, the plugin takes the user's message and the assistant's response and saves them to Mem0.

## License

MIT
