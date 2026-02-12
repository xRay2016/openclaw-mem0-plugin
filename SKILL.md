# OpenClaw Mem0 Plugin

Mem0 integration for OpenClaw. Adds intelligent long-term memory to your agents, allowing them to remember user preferences, facts, and past conversations automatically.

## When to use

- You want your agent to remember user details (name, job, preferences) across sessions
- You need "infinite context" by retrieving relevant past interactions
- You want to build a personalized assistant that learns over time
- You need both cloud (managed) and self-hosted (local) memory options

## Setup

### Platform Mode (Recommended)

1. Get a free API key at [mem0.ai](https://mem0.ai)
2. Add to your OpenClaw config:

```json
{
  "plugins": {
    "entries": {
      "openclaw-mem0": {
        "enabled": true,
        "config": {
          "mode": "platform",
          "apiKey": "your-mem0-api-key",
          "userId": "default-user"
        }
      }
    }
  }
}
```

### Open-Source Mode (Self-Hosted)

Connect to your own Mem0 instance (requires `mem0ai` package installed):

```json
{
  "plugins": {
    "entries": {
      "openclaw-mem0": {
        "enabled": true,
        "config": {
          "mode": "open-source",
          "oss": {
            "vectorStore": {
              "provider": "chroma",
              "config": {
                "collectionName": "memories",
                "path": "./chroma_db"
              }
            }
          }
        }
      }
    }
  }
}
```

## Usage

This plugin works automatically (Zero-Shot) but also provides manual tools.

### Automatic Features

- **Auto-Recall**: Before every agent turn, it searches memory for relevant context and injects it into the system prompt.
- **Auto-Capture**: After every agent turn, it analyzes the conversation and stores key facts into memory.

### Manual Tools

The agent can proactively call these tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `memory_store` | Explicitly save a fact | `text` (string), `longTerm` (bool) |
| `memory_search` | Search memories | `query` (string), `scope` ("session"\|"long-term") |
| `memory_get` | Get memory by ID | `memoryId` (string) |
| `memory_list` | List all memories | `userId` (string) |
| `memory_forget` | Delete a memory | `memoryId` (string) or `query` (string) |

### Example

**User**: "I'm moving to Tokyo next month."
*Agent automatically captures this fact.*

**(Two weeks later)**
**User**: "What's a good restaurant for my farewell dinner?"
*Agent automatically recalls "User is moving to Tokyo" and suggests a restaurant in their current city.*

## Plugin structure

```
openclaw-mem0/
  package.json            # NPM package config (@xray2016/openclaw-mem0)
  index.ts                # Plugin implementation & tools
  lib/                    # Internal Mem0 client implementation
  SKILL.md                # This file
  README.md               # Detailed documentation
```

## Author

Maintained by @xRay2016. Modified from the original Mem0 OpenClaw integration.
