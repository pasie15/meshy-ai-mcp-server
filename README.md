# Meshy AI MCP Server

This is a [Model Context Protocol](https://github.com/modelcontextprotocol/modelcontextprotocol) (MCP) server that wraps the [Meshy AI API](https://docs.meshy.ai/). It enables MCP clients (like Claude Desktop, Cursor, Cline) to interact with Meshy's generative 3D tools directly.

## Features

- **Text-to-3D**: Generate 3D models from text prompts.
- **Image-to-3D**: Create 3D models from reference images.
- **Text-to-Texture**: Apply textures to existing models using text prompts.
- **Model Optimization**: Remesh and optimize geometry.
- **Rigging**: Auto-rig 3D characters for animation.
- **Animation**: Apply animations to rigged characters.
- **Streaming**: Real-time progress updates for long-running tasks.

## Installation

### Option 1: Run directly with npx (Recommended)

You can run the server directly using `npx` without installing it globally.

```json
{
  "mcpServers": {
    "meshy-ai": {
      "command": "npx",
      "args": [
        "-y",
        "meshy-ai-mcp-server"
      ],
      "env": {
        "MESHY_API_KEY": "your_meshy_api_key_here"
      }
    }
  }
}
```

### Option 2: Clone and Build Locally

If you want to modify the code or run it from a local source:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd meshy-ai-mcp-server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Build the project:**
    ```bash
    npm run build
    ```

4.  **Configure your MCP Client:**

    Add the following to your MCP client configuration (e.g., `claude_desktop_config.json` or VS Code settings):

    ```json
    {
      "mcpServers": {
        "meshy-ai": {
          "command": "node",
          "args": [
            "/absolute/path/to/meshy-ai-mcp-server/dist/index.js"
          ],
          "env": {
            "MESHY_API_KEY": "your_meshy_api_key_here"
          }
        }
      }
    }
    ```

## Configuration

You need a Meshy AI API key to use this server.

1.  Get your API key from the [Meshy Dashboard](https://app.meshy.ai/settings/api).
2.  Set the `MESHY_API_KEY` environment variable in your MCP client configuration (as shown above).

### Optional Environment Variables

- `MESHY_API_BASE`: Override the API base URL (default: `https://api.meshy.ai/openapi`).
- `MESHY_STREAM_TIMEOUT_MS`: Timeout for streaming responses in milliseconds (default: `300000` aka 5 minutes).

## Development

To run the server in development mode with auto-reloading:

```bash
# Create a .env file
echo "MESHY_API_KEY=your_key_here" > .env

# Run in dev mode
npm run dev
```

## Available Tools

- **Text to 3D**: `create_text_to_3d_task`, `retrieve_text_to_3d_task`, `list_text_to_3d_tasks`, `stream_text_to_3d_task`
- **Image to 3D**: `create_image_to_3d_task`, `retrieve_image_to_3d_task`, `list_image_to_3d_tasks`, `stream_image_to_3d_task`
- **Texturing**: `create_text_to_texture_task`, `retrieve_text_to_texture_task`, `list_text_to_texture_tasks`, `stream_text_to_texture_task`
- **Remeshing**: `create_remesh_task`, `retrieve_remesh_task`, `list_remesh_tasks`, `stream_remesh_task`
- **Rigging**: `create_rigging_task`, `retrieve_rigging_task`, `list_rigging_tasks`, `stream_rigging_task`
- **Animation**: `create_animation_task`, `retrieve_animation_task`, `list_animation_tasks`, `stream_animation_task`
- **Utility**: `get_balance`

## License

MIT