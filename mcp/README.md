# chatbot-mcp-server

This MCP server exposes five shared tools:

- `getConversationContext`
- `getUserDetails`
- `getSiteConfig`
- `searchKnowledge`
- `requestHumanAgent`

Select the transport with `MCP_TRANSPORT`:

- `stdio`: Codex CLI starts the server as a local child process.
- `http`: The server exposes a Streamable HTTP endpoint at `POST /mcp` for the chat agent.

## Configuration

```powershell
Copy-Item .env.example .env
npm install
npm run build
```

Set `API_BASE_URL` and set `API_SECRET_TOKEN` to the same value as the
backend's `INTERNAL_MCP_SECRET_TOKEN`. The user access token must be
tenant-scoped. The backend validates the token and access permissions before
returning the trusted actor, site, and conversation context used by each tool.

## Local Testing with Codex CLI (stdio)

```powershell
codex mcp remove chatbot-local
codex mcp add chatbot-local `
  --env "DOTENV_CONFIG_PATH=C:\Zodinet\chatbot-api\mcp-server\.env" `
  --env "MCP_TRANSPORT=stdio" `
  --env "MCP_ACCESS_TOKEN=<tenant-scoped-access-token>" `
  -- node "C:\Zodinet\chatbot-api\mcp-server\dist\index.js"

codex mcp get chatbot-local --json
codex mcp list
```

Restart Codex, run `/mcp`, and then ask Codex to list or invoke a tool. Never
store a real access token in a committed file.

## Streamable HTTP

```powershell
npm start
```

Set `MCP_TRANSPORT=http`, `MCP_HOST=127.0.0.1`, and `MCP_PORT=3002` in `.env`.
The endpoint is `http://127.0.0.1:3002/mcp` and requires an
`Authorization: Bearer <tenant-scoped-access-token>` header.

You can verify the endpoint with Codex:

```powershell
$env:CHATBOT_MCP_TOKEN = '<tenant-scoped-access-token>'
codex mcp add chatbot-http `
  --url http://127.0.0.1:3002/mcp `
  --bearer-token-env-var CHATBOT_MCP_TOKEN
```

For more information, see the
[Codex MCP documentation](https://developers.openai.com/codex/mcp/).
