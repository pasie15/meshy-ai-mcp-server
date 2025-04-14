# Meshy AI MCP Server

This is a Model Context Protocol (MCP) server for interacting with the [Meshy AI API](https://docs.meshy.ai/). It provides tools for generating 3D models from text and images, applying textures, and remeshing models.

## Features

- Generate 3D models from text prompts
- Generate 3D models from images
- Apply textures to 3D models
- Remesh and optimize 3D models
- Stream task progress in real-time
- List and retrieve tasks
- Check account balance

## Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd meshy-ai-mcp-server
   ```


2. **(Recommended)** Set up a virtual environment:

   *Using venv:*
   ```bash
   python -m venv .venv
   # On Windows
   .\.venv\Scripts\activate
   # On macOS/Linux
   source .venv/bin/activate
   ```

   *Using Conda:*
   ```bash
   conda create --name meshy-mcp python=3.9  # Or your preferred Python version
   conda activate meshy-mcp
   ```

3. Install the MCP package:
   ```bash
   pip install mcp
   ```

4. Install dependencies:
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Meshy AI API key:
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

## Usage

### Starting the Server

You can start the server directly with Python:

```bash
python src/server.py
```

Or using the MCP CLI:

```bash
mcp run config.json
```

### Editor Configuration

Add this MCP server configuration to your Cline/Roo-Cline/Cursor/VS Code settings (e.g., `.vscode/settings.json` or user settings):

```json
{
  "mcpServers": {
    "meshy-ai": {
      "command": "python",
      "args": [
        "path/to/your/meshy-ai-mcp-server/src/server.py"  // <-- Make sure this path is correct!
      ],
      "disabled": false,
      "autoApprove": [],
      "alwaysAllow": []
    }
  }
}
```

### Recommended: Using MCP dev mode (starts inspector)

For development and debugging, run the server using `mcp dev`:

```bash
mcp dev src/server.py
```

When running with `mcp dev`, you'll see output like:

```
Starting MCP inspector...
⚙️ Proxy server listening on port 6277
🔍 MCP Inspector is up and running at http://127.0.0.1:6274 🚀
New SSE connection
```
You can open the inspector URL in your browser to monitor MCP communication.

### Available Tools

The server provides the following tools:

#### Creation Tools

- `create_text_to_3d_task`: Generate a 3D model from a text prompt
- `create_image_to_3d_task`: Generate a 3D model from an image
- `create_text_to_texture_task`: Apply textures to a 3D model using text prompts
- `create_remesh_task`: Remesh and optimize a 3D model

#### Retrieval Tools

- `retrieve_text_to_3d_task`: Get details of a Text to 3D task
- `retrieve_image_to_3d_task`: Get details of an Image to 3D task
- `retrieve_text_to_texture_task`: Get details of a Text to Texture task
- `retrieve_remesh_task`: Get details of a Remesh task

#### Listing Tools

- `list_text_to_3d_tasks`: List Text to 3D tasks
- `list_image_to_3d_tasks`: List Image to 3D tasks
- `list_text_to_texture_tasks`: List Text to Texture tasks
- `list_remesh_tasks`: List Remesh tasks

#### Streaming Tools

- `stream_text_to_3d_task`: Stream updates for a Text to 3D task
- `stream_image_to_3d_task`: Stream updates for an Image to 3D task
- `stream_text_to_texture_task`: Stream updates for a Text to Texture task
- `stream_remesh_task`: Stream updates for a Remesh task

#### Utility Tools

- `get_balance`: Check your Meshy AI account balance

### Resources

The server also provides the following resources:

- `health://status`: Health check endpoint
- `task://{task_type}/{task_id}`: Access task details by type and ID

## Configuration

The server can be configured using environment variables:

- `MESHY_API_KEY`: Your Meshy AI API key (required)
- `MCP_PORT`: Port for the MCP server to listen on (default: 8081)
- `TASK_TIMEOUT`: Maximum time to wait for a task to complete when streaming (default: 300 seconds)

## Examples

### Generating a 3D Model from Text

```python
from mcp.client import MCPClient

client = MCPClient()
result = client.use_tool(
    "meshy-ai",
    "create_text_to_3d_task",
    {
        "request": {
            "mode": "preview",
            "prompt": "a monster mask",
            "art_style": "realistic",
            "should_remesh": True
        }
    }
)
print(f"Task ID: {result['id']}")
```

### Checking Task Status

```python
from mcp.client import MCPClient

client = MCPClient()
task_id = "your-task-id"
result = client.use_tool(
    "meshy-ai",
    "retrieve_text_to_3d_task",
    {
        "task_id": task_id
    }
)
print(f"Status: {result['status']}")
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.