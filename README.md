# OpenClaw Mem0 Plugin

[中文文档](README_zh.md)

This is a OpenClaw plugin that integrates with [Mem0](https://github.com/mem0ai/mem0) to provide intelligent long-term memory capabilities for your agents.

## Features

- **Auto-Recall**: Automatically searches for relevant past interactions and injects them into the context before the agent starts (`before_agent_start`).
- **Auto-Capture**: Automatically analyzes conversation turns and stores key information into long-term memory after the agent finishes (`agent_end`).
- **Hybrid Scope**: Supports both **Session Memory** (short-term, current conversation) and **User Memory** (long-term, cross-conversation).
- **Dual Mode**: Supports both **Mem0 Platform** (Cloud) and **Open-Source** (Self-hosted) backends.
- **Tools**: Provides 5 powerful tools for agents to interact with memory manually:
  - `memory_search`: Search for specific information.
  - `memory_store`: Explicitly save important facts.
  - `memory_get`: Retrieve a specific memory by ID.
  - `memory_list`: List all memories for a user.
  - `memory_forget`: Delete specific or matching memories (GDPR compliant).

## Installation

Install via OpenClaw CLI (npm registry):

```bash
openclaw plugins install @xray2016/openclaw-mem0
```

## Configuration

You can configure the plugin in your `~/.openclaw/openclaw.json`, the apikey and host can get from the platform.

### Platform Mode (Recommended)

Use the managed Mem0 Cloud service.

```json
// plugins.entries
"openclaw-mem0": {
    "enabled": true,
    "config": {
        "mode": "platform",
        "apiKey": "${MEM0_API_KEY}",
        "userId": "openclaw-user",
        "host": "${MEM0_HOST}"
    }
}
```

## Usage

### 1. Automatic Memory (Zero-Shot)
Just enable the plugin. When you chat with your agent:
- It will automatically "remember" facts you shared in previous conversations.
- It will "recall" relevant context when you ask related questions.

### 2. Manual Tools
Your agents can proactively use tools:

- **User**: "Please remember that I'm allergic to peanuts."
- **Agent**: Calls `memory_store({ text: "User is allergic to peanuts", longTerm: true })`

- **User**: "What was that book I mentioned last week?"
- **Agent**: Calls `memory_search({ query: "book mentioned last week", scope: "long-term" })`

## CLI Commands

This plugin extends the OpenClaw CLI with memory management commands:

```bash
# Search memories
openclaw mem0 search "hobbies"

# Show memory statistics
openclaw mem0 stats
```


## Acknowledgements

This project is modified from [mem0/openclaw](https://github.com/mem0ai/mem0/tree/main/openclaw).

## License

Apache License Version 2.0
