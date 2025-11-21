# Meshy AI MCP Server (TypeScript)

This repository provides a Model Context Protocol (MCP) server implemented in **Node.js + TypeScript** for interacting with the [Meshy AI API](https://docs.meshy.ai/). It exposes tools for text-to-3d, image-to-3d, texturing, remeshing, rigging, animations, and balance checks.

> Branch notice: the previous `work` branch has been renamed to `main` so the latest TypeScript implementation lives on the default branch. If you pulled before this rename, run `git fetch --all --prune` and check out `main` to see the updates.

## Features

- Generate 3D models from text or images
- Apply textures to 3D models
- Remesh and optimize 3D models
- Rig 3D characters for animation
- Create animation tasks (using `action_id` values from the Meshy animation library)
- Stream task progress with server-sent events
- List and retrieve tasks of every type
- Check account balance

## Prerequisites

- Node.js 18+
- A Meshy AI API key (`MESHY_API_KEY`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your API key (and optional overrides):
   ```bash
   cp .env.example .env
   # edit .env to add MESHY_API_KEY
   ```

3. Build the server:
   ```bash
   npm run build
   ```

## Running the MCP server

You can start the compiled server directly:

```bash
npm start
```

Or run it in development mode without building:

```bash
npm run dev
```

### MCP client configuration

Add this MCP server configuration to your MCP-enabled editor (e.g., Cursor, Cline, or any MCP client):

```json
{
  "mcpServers": {
    "meshy-ai": {
      "command": "node",
      "args": ["dist/index.js"],
      "disabled": false,
      "autoApprove": [],
      "alwaysAllow": []
    }
  }
}
```

> Ensure you have built the project (`npm run build`) so that `dist/index.js` exists.

## Available tools

- `create_text_to_3d_task`, `retrieve_text_to_3d_task`, `list_text_to_3d_tasks`, `stream_text_to_3d_task`
- `create_image_to_3d_task`, `retrieve_image_to_3d_task`, `list_image_to_3d_tasks`, `stream_image_to_3d_task`
- `create_text_to_texture_task`, `retrieve_text_to_texture_task`, `list_text_to_texture_tasks`, `stream_text_to_texture_task`
- `create_remesh_task`, `retrieve_remesh_task`, `list_remesh_tasks`, `stream_remesh_task`
- `create_rigging_task`, `retrieve_rigging_task`, `list_rigging_tasks`, `stream_rigging_task`
- `create_animation_task`, `retrieve_animation_task`, `list_animation_tasks`, `stream_animation_task`
- `get_balance`

### Rigging and animations

Rigging and animation payloads are passed straight through to the Meshy API. Refer to the Meshy docs for the exact request shapes:

- Rigging and animation endpoints: https://docs.meshy.ai/en/api/rigging-and-animation
- Animation action library (for `action_id` values): https://docs.meshy.ai/en/api/animation-library

Tool inputs for rigging and animations **do not** require a wrapper object. Provide the payload exactly as the Meshy API expects, e.g.:

```jsonc
// Rigging
{
  "model_url": "https://.../rig-me.glb",
  "rig_preset": "STANDARD_HUMANOID"
}

// Animation (action_id is required)
{
  "rigging_task_id": "...",
  "action_id": "walking",
  "fps": 30
}
```

## Environment variables

- `MESHY_API_KEY` (required): your Meshy AI API key.
- `MESHY_API_BASE` (optional): override the Meshy API base URL (defaults to `https://api.meshy.ai/openapi`).
- `MESHY_STREAM_TIMEOUT_MS` (optional): default timeout in milliseconds for stream endpoints (defaults to 300000).

## License

MIT
