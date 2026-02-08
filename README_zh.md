# OpenClaw Mem0 插件

这是一个 OpenClaw 插件，集成了 [Mem0](https://mem0.ai)，为您的智能体提供长期记忆能力。

它会自动执行以下操作：
- **搜索 (Search)**：在智能体开始处理请求之前，检索相关的记忆 (`before_agent_start`)。
- **记忆 (Memory)**：在智能体完成响应后，将当前对话轮次添加到记忆中 (`agent_end`)。

## 配置

在您的 OpenClaw 环境中设置以下环境变量（例如 `~/.openclaw/.env`）：

- `MEM0_BASE_URL`: Mem0 API 基础 URL（必填）。例如 `https://api.mem0.ai`
- `MEM0_API_KEY`: 您的 Mem0 平台 API Key（必填）。请从 [Mem0 Dashboard](https://app.mem0.ai/) 获取。
- `MEM0_USER_ID`: （可选）关联记忆的用户 ID。默认为 `openclaw-user`，如果可用则使用 `context.userId`。

快速设置：
```bash
echo "MEM0_BASE_URL=https://api.mem0.ai" >> ~/.openclaw/.env
echo "MEM0_API_KEY=your_api_key_here" >> ~/.openclaw/.env
```

## 安装

1.  使用 OpenClaw CLI 安装插件：
    ```bash
    openclaw plugins install github:xRay2016/openclaw-mem0-plugin
    ```

2.  重启 OpenClaw Gateway 以应用更改：
    ```bash
    openclaw gateway restart
    ```

## 工作原理

- **搜索**：在智能体运行之前，插件获取用户的最后一条消息，在 Mem0 中搜索相关记忆，并将其注入到上下文中（预置到系统提示词或上下文中）。
- **记忆**：在智能体响应后，插件获取用户的消息和助手的响应，并将它们保存到 Mem0 中。

## 许可证

MIT
