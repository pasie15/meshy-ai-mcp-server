"""
Meshy AI MCP Server - Provides tools for interacting with Meshy AI's 3D generation API
"""
import os
import json
import httpx
import asyncio
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, Literal
from mcp.server.fastmcp import FastMCP

# Load environment variables from .env file
load_dotenv()

# Initialize the MCP server
mcp = FastMCP("Meshy AI MCP Server", log_level="ERROR")

# Get API key from environment
MESHY_API_KEY = os.getenv("MESHY_API_KEY")
if not MESHY_API_KEY:
    raise ValueError("MESHY_API_KEY environment variable is not set")

# Define Pydantic models for request/response validation
class TextTo3DTaskRequest(BaseModel):
    mode: str = Field(..., description="Task mode: 'preview' or 'refine'")
    prompt: str = Field(..., description="Text prompt describing the 3D model to generate")
    art_style: str = Field("realistic", description="Art style for the 3D model")
    should_remesh: bool = Field(True, description="Whether to remesh the model after generation")

class RemeshTaskRequest(BaseModel):
    input_task_id: str = Field(..., description="ID of the input task to remesh")
    target_formats: List[str] = Field(["glb", "fbx"], description="Target formats for the remeshed model")
    topology: str = Field("quad", description="Topology type: 'quad' or 'triangle'")
    target_polycount: int = Field(50000, description="Target polygon count for the remeshed model")
    resize_height: float = Field(1.0, description="Resize height for the remeshed model")
    origin_at: str = Field("bottom", description="Origin position: 'bottom', 'center', etc.")

class ImageTo3DTaskRequest(BaseModel):
    image_url: str = Field(..., description="URL of the image to convert to 3D")
    prompt: Optional[str] = Field(None, description="Optional text prompt to guide the 3D generation")
    art_style: str = Field("realistic", description="Art style for the 3D model")

class TextToTextureTaskRequest(BaseModel):
    model_url: str = Field(..., description="URL of the 3D model to texture")
    object_prompt: str = Field(..., description="Text prompt describing the object")
    style_prompt: Optional[str] = Field(None, description="Text prompt describing the style")
    enable_original_uv: bool = Field(True, description="Whether to use original UV mapping")
    enable_pbr: bool = Field(True, description="Whether to enable PBR textures")
    resolution: str = Field("1024", description="Texture resolution")
    negative_prompt: Optional[str] = Field(None, description="Negative prompt to guide generation")
    art_style: str = Field("realistic", description="Art style for the texture")

class ListTasksParams(BaseModel):
    page_size: int = Field(10, description="Number of tasks to return per page")
    page: int = Field(1, description="Page number to return")

class TaskResponse(BaseModel):
    id: str = Field(..., description="Task ID")
    result: Optional[str] = Field(None, description="Task result (if available)")

@mcp.tool()
async def create_text_to_3d_task(request: TextTo3DTaskRequest) -> TaskResponse:
    """
    Create a new Text to 3D task with Meshy AI.
    
    This tool allows you to generate a 3D model from a text prompt.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.meshy.ai/openapi/v2/text-to-3d",
            headers=headers,
            json=request.model_dump(exclude_none=True)
        )
        response.raise_for_status()
        data = response.json()
        
        # The API returns the task ID in the "result" field
        return TaskResponse(id=data["result"], result=data.get("result"))

@mcp.tool()
async def retrieve_text_to_3d_task(task_id: str) -> Dict[str, Any]:
    """
    Retrieve a Text to 3D task by its ID.
    
    This tool allows you to check the status and get the results of a Text to 3D task.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v2/text-to-3d/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def create_remesh_task(request: RemeshTaskRequest) -> TaskResponse:
    """
    Create a new Remesh task with Meshy AI.
    
    This tool allows you to remesh an existing 3D model.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.meshy.ai/openapi/v1/remesh",
            headers=headers,
            json=request.model_dump(exclude_none=True)
        )
        response.raise_for_status()
        data = response.json()
        
        return TaskResponse(id=data["id"], result=data.get("id"))

@mcp.tool()
async def create_image_to_3d_task(request: ImageTo3DTaskRequest) -> TaskResponse:
    """
    Create a new Image to 3D task with Meshy AI.
    
    This tool allows you to generate a 3D model from an image.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.meshy.ai/openapi/v1/image-to-3d",
            headers=headers,
            json=request.model_dump(exclude_none=True)
        )
        response.raise_for_status()
        data = response.json()
        
        return TaskResponse(id=data["id"], result=data.get("id"))

@mcp.tool()
async def create_text_to_texture_task(request: TextToTextureTaskRequest) -> TaskResponse:
    """
    Create a new Text to Texture task with Meshy AI.
    
    This tool allows you to apply textures to a 3D model using text prompts.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.meshy.ai/openapi/v1/text-to-texture",
            headers=headers,
            json=request.model_dump(exclude_none=True)
        )
        response.raise_for_status()
        data = response.json()
        
        return TaskResponse(id=data["result"], result=data.get("result"))

@mcp.tool()
async def retrieve_image_to_3d_task(task_id: str) -> Dict[str, Any]:
    """
    Retrieve an Image to 3D task by its ID.
    
    This tool allows you to check the status and get the results of an Image to 3D task.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def retrieve_remesh_task(task_id: str) -> Dict[str, Any]:
    """
    Retrieve a Remesh task by its ID.
    
    This tool allows you to check the status and get the results of a Remesh task.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v1/remesh/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def retrieve_text_to_texture_task(task_id: str) -> Dict[str, Any]:
    """
    Retrieve a Text to Texture task by its ID.
    
    This tool allows you to check the status and get the results of a Text to Texture task.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v1/text-to-texture/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def list_text_to_3d_tasks(params: Optional[ListTasksParams] = None) -> List[Dict[str, Any]]:
    """
    List Text to 3D tasks.
    
    This tool allows you to retrieve a list of your Text to 3D tasks.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    query_params = {}
    if params:
        query_params = params.model_dump(exclude_none=True)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.meshy.ai/openapi/v2/text-to-3d",
            headers=headers,
            params=query_params
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def list_image_to_3d_tasks(params: Optional[ListTasksParams] = None) -> List[Dict[str, Any]]:
    """
    List Image to 3D tasks.
    
    This tool allows you to retrieve a list of your Image to 3D tasks.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    query_params = {}
    if params:
        query_params = params.model_dump(exclude_none=True)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.meshy.ai/openapi/v1/image-to-3d",
            headers=headers,
            params=query_params
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def list_remesh_tasks(params: Optional[ListTasksParams] = None) -> List[Dict[str, Any]]:
    """
    List Remesh tasks.
    
    This tool allows you to retrieve a list of your Remesh tasks.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    query_params = {}
    if params:
        query_params = params.model_dump(exclude_none=True)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.meshy.ai/openapi/v1/remesh",
            headers=headers,
            params=query_params
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def list_text_to_texture_tasks(params: Optional[ListTasksParams] = None) -> List[Dict[str, Any]]:
    """
    List Text to Texture tasks.
    
    This tool allows you to retrieve a list of your Text to Texture tasks.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    query_params = {}
    if params:
        query_params = params.model_dump(exclude_none=True)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.meshy.ai/openapi/v1/text-to-texture",
            headers=headers,
            params=query_params
        )
        response.raise_for_status()
        return response.json()

@mcp.tool()
async def stream_text_to_3d_task(task_id: str, timeout: int = 300) -> Dict[str, Any]:
    """
    Stream a Text to 3D task by its ID.
    
    This tool allows you to stream updates for a Text to 3D task until it completes or fails.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Accept": "text/event-stream"
    }
    
    async with httpx.AsyncClient() as client:
        with client.stream(
            "GET",
            f"https://api.meshy.ai/openapi/v2/text-to-3d/{task_id}/stream",
            headers=headers,
            timeout=timeout
        ) as response:
            response.raise_for_status()
            
            final_data = None
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = json.loads(line[5:])
                    final_data = data
                    
                    if data.get("status") in ["SUCCEEDED", "FAILED", "CANCELED"]:
                        break
            
            return final_data or {"error": "No data received from stream"}

@mcp.tool()
async def stream_image_to_3d_task(task_id: str, timeout: int = 300) -> Dict[str, Any]:
    """
    Stream an Image to 3D task by its ID.
    
    This tool allows you to stream updates for an Image to 3D task until it completes or fails.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Accept": "text/event-stream"
    }
    
    async with httpx.AsyncClient() as client:
        with client.stream(
            "GET",
            f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}/stream",
            headers=headers,
            timeout=timeout
        ) as response:
            response.raise_for_status()
            
            final_data = None
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = json.loads(line[5:])
                    final_data = data
                    
                    if data.get("status") in ["SUCCEEDED", "FAILED", "CANCELED"]:
                        break
            
            return final_data or {"error": "No data received from stream"}

@mcp.tool()
async def stream_remesh_task(task_id: str, timeout: int = 300) -> Dict[str, Any]:
    """
    Stream a Remesh task by its ID.
    
    This tool allows you to stream updates for a Remesh task until it completes or fails.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Accept": "text/event-stream"
    }
    
    async with httpx.AsyncClient() as client:
        with client.stream(
            "GET",
            f"https://api.meshy.ai/openapi/v1/remesh/{task_id}/stream",
            headers=headers,
            timeout=timeout
        ) as response:
            response.raise_for_status()
            
            final_data = None
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = json.loads(line[5:])
                    final_data = data
                    
                    if data.get("status") in ["SUCCEEDED", "FAILED", "CANCELED"]:
                        break
            
            return final_data or {"error": "No data received from stream"}

@mcp.tool()
async def stream_text_to_texture_task(task_id: str, timeout: int = 300) -> Dict[str, Any]:
    """
    Stream a Text to Texture task by its ID.
    
    This tool allows you to stream updates for a Text to Texture task until it completes or fails.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}",
        "Accept": "text/event-stream"
    }
    
    async with httpx.AsyncClient() as client:
        with client.stream(
            "GET",
            f"https://api.meshy.ai/openapi/v1/text-to-texture/{task_id}/stream",
            headers=headers,
            timeout=timeout
        ) as response:
            response.raise_for_status()
            
            final_data = None
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = json.loads(line[5:])
                    final_data = data
                    
                    if data.get("status") in ["SUCCEEDED", "FAILED", "CANCELED"]:
                        break
            
            return final_data or {"error": "No data received from stream"}

@mcp.tool()
async def get_balance() -> Dict[str, Any]:
    """
    Get the current balance of your Meshy AI account.
    
    This tool allows you to check your remaining credits.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.meshy.ai/openapi/v1/balance",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.resource("health://status")
def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {
        "status": "ok",
        "api_key_configured": bool(MESHY_API_KEY)
    }

# Add task resources for each task type
@mcp.resource("task://text-to-3d/{task_id}")
async def get_text_to_3d_task(task_id: str) -> Dict[str, Any]:
    """
    Get a Text to 3D task by its ID.
    
    This resource allows you to access task details and results.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v2/text-to-3d/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.resource("task://image-to-3d/{task_id}")
async def get_image_to_3d_task(task_id: str) -> Dict[str, Any]:
    """
    Get an Image to 3D task by its ID.
    
    This resource allows you to access task details and results.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v1/image-to-3d/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.resource("task://remesh/{task_id}")
async def get_remesh_task(task_id: str) -> Dict[str, Any]:
    """
    Get a Remesh task by its ID.
    
    This resource allows you to access task details and results.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.meshy.ai/openapi/v1/remesh/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

@mcp.resource("task://text-to-texture/{task_id}")
async def get_text_to_texture_task(task_id: str) -> Dict[str, Any]:
    """
    Get a Text to Texture task by its ID.
    
    This resource allows you to access task details and results.
    """
    headers = {
        "Authorization": f"Bearer {MESHY_API_KEY}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{endpoint_map[task_type]}/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        return response.json()

if __name__ == "__main__":
    # Start the MCP server
    mcp.run()