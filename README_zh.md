# OpenClaw Mem0 插件

这是一个 OpenClaw 插件，集成了 [Mem0](https://github.com/mem0ai/mem0)，为您的智能体提供智能的长期记忆能力。

## 功能特性

- **自动回忆 (Auto-Recall)**：在智能体开始处理请求之前，自动搜索相关的历史交互并将其注入到上下文中 (`before_agent_start`)。
- **自动捕获 (Auto-Capture)**：在智能体完成响应后，自动分析对话轮次并将关键信息存储到长期记忆中 (`agent_end`)。
- **混合作用域 (Hybrid Scope)**：同时支持**会话记忆**（短期，当前对话）和**用户记忆**（长期，跨对话）。
- **双模式 (Dual Mode)**：支持 **Mem0 平台**（云端）和 **开源**（自托管）后端。
- **工具 (Tools)**：为智能体提供 5 个强大的工具来手动操作记忆：
  - `memory_search`: 搜索特定信息。
  - `memory_store`: 显式保存重要事实。
  - `memory_get`: 通过 ID 获取特定记忆。
  - `memory_list`: 列出用户的所有记忆。
  - `memory_forget`: 删除指定或匹配的记忆（符合 GDPR）。

## 安装

通过 OpenClaw CLI 安装（npm 源）：

```bash
openclaw plugins install @xray2016/openclaw-mem0
```

## 配置

您可以在 `config.json` 中配置该插件。API Key 和 Host 可以从平台获取。

### 平台模式（推荐）

使用托管的 Mem0 云服务。

```json
"openclaw-mem0": {
  "enabled": true,
  "config": {
    "mode": "platform",
    "apiKey": "${MEM0_API_KEY}", // 请在 .env 文件中设置
    "userId": "default-user",
    "autoRecall": true,
    "autoCapture": true
  }
}
```

### 开源模式（自托管）

连接到您自托管的 Mem0 实例。

**注意**：要使用开源模式，您必须在 OpenClaw 环境中手动安装 `mem0ai` 包，因为为了保持核心轻量化，本插件不再内置该依赖。

```json
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
```

## 使用方法

### 1. 自动记忆（零配置）
只需启用插件即可。当您与智能体聊天时：
- 它会自动“记住”您在之前的对话中分享的事实。
- 当您提出相关问题时，它会自动“回忆”相关的上下文。

### 2. 手动工具
您的智能体可以主动使用工具：

- **用户**：“请记住我对花生过敏。”
- **智能体**：调用 `memory_store({ text: "用户对花生过敏", longTerm: true })`

- **用户**：“我上周提到的那本书叫什么？”
- **智能体**：调用 `memory_search({ query: "上周提到的书", scope: "long-term" })`

## CLI 命令

本插件扩展了 OpenClaw CLI，增加了记忆管理命令：

```bash
# 搜索记忆
openclaw mem0 search "爱好"

# 显示记忆统计
openclaw mem0 stats
```

## 致谢

本项目修改自 [mem0/openclaw](https://github.com/mem0ai/mem0/tree/main/openclaw)。

## 许可证

Apache License Version 2.0
