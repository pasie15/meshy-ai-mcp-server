# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server wrapping the [Meshy AI API](https://docs.meshy.ai/) for generative 3D tools. Published as an npm package (`meshy-ai-mcp-server`) and run via `npx` or locally by MCP clients (Claude Desktop, Cursor, etc.).

## Commands

- **Build:** `npm run build` (runs `tsc`)
- **Dev:** `npm run dev` (runs `ts-node --esm src/index.ts`)
- **Start:** `npm run start` (runs compiled `dist/index.js`)

No test framework is configured. No linter is configured.

## Architecture

This is an ESM TypeScript project (`"type": "module"`) with two source files:

- **`src/client.ts`** — `MeshyClient` class: HTTP client for the Meshy REST API. Handles GET/POST requests with Bearer auth, query parameter building, and SSE streaming. Stream responses are parsed for `data:` lines and terminate on `SUCCEEDED`/`FAILED`/`CANCELED` status.

- **`src/index.ts`** — Server entrypoint (has shebang for CLI use). Creates an `McpServer` instance using `@modelcontextprotocol/sdk`, registers 51 tools covering 10 Meshy API domains (text-to-3d, image-to-3d, multi-image-to-3d, text-to-texture, retexture, text-to-image, image-to-image, remesh, rigging, animation) plus a balance check. Each domain has create/retrieve/list/stream/delete tools. Connects via `StdioServerTransport`. Each tool handler delegates to `MeshyClient` and wraps results with `jsonResponse()`.

### Tool Registration Pattern

All tools follow the same pattern: `server.registerTool(name, { description, inputSchema: z.object({...}) }, async handler)`. The handler calls `client.get()`, `client.post()`, or `client.stream()` and wraps the result in `jsonResponse()`. When adding new Meshy API endpoints, follow this existing pattern.

### API Versioning

Text-to-3D uses `/v2/`, all other endpoints use `/v1/`. Preserve this when adding tools.

## Environment Variables

- `MESHY_API_KEY` (required) — API key from Meshy dashboard
- `MESHY_API_BASE` (optional) — Override API base URL (default: `https://api.meshy.ai/openapi`)
- `MESHY_STREAM_TIMEOUT_MS` (optional) — SSE stream timeout in ms (default: 300000)

Uses `dotenv` to load from `.env` file in dev.
