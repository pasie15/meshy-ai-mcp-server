#!/usr/bin/env node
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MeshyClient } from "./client.js";

dotenv.config();

const apiKey = process.env.MESHY_API_KEY;
if (!apiKey) {
  throw new Error("MESHY_API_KEY environment variable is not set");
}

const apiBase = process.env.MESHY_API_BASE;
const parsedStreamTimeout = process.env.MESHY_STREAM_TIMEOUT_MS
  ? Number.parseInt(process.env.MESHY_STREAM_TIMEOUT_MS, 10)
  : undefined;
const streamTimeoutMs = Number.isFinite(parsedStreamTimeout) ? parsedStreamTimeout : undefined;

const client = new MeshyClient(apiKey, { apiBase, streamTimeoutMs });

const server = new McpServer(
  {
    name: "Meshy AI MCP Server (Node)",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

const jsonResponse = (payload: unknown) => ({
  content: [
    {
      type: "text" as const,
      text: JSON.stringify(payload, null, 2),
    },
  ],
});

server.registerTool(
  "create_text_to_3d_task",
  {
    description: "Generate a 3D model from a text prompt.",
    inputSchema: z.object({
      mode: z.string(),
      prompt: z.string(),
      art_style: z.string().optional(),
      should_remesh: z.boolean().optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v2/text-to-3d", args)),
);

server.registerTool(
  "retrieve_text_to_3d_task",
  {
    description: "Retrieve the status and result of a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "list_text_to_3d_tasks",
  {
    description: "List previously created text-to-3d tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v2/text-to-3d", { query: args })),
);

server.registerTool(
  "stream_text_to_3d_task",
  {
    description: "Stream updates for a text-to-3d task until it completes.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v2/text-to-3d/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_image_to_3d_task",
  {
    description: "Generate a 3D model from an input image and optional prompt.",
    inputSchema: z.object({
      image_url: z.string(),
      prompt: z.string().optional(),
      art_style: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/image-to-3d", args)),
);

server.registerTool(
  "retrieve_image_to_3d_task",
  {
    description: "Retrieve the status and result of an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "list_image_to_3d_tasks",
  {
    description: "List previously created image-to-3d tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/image-to-3d", { query: args })),
);

server.registerTool(
  "stream_image_to_3d_task",
  {
    description: "Stream updates for an image-to-3d task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/image-to-3d/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_text_to_texture_task",
  {
    description: "Apply textures to a 3D model using text prompts.",
    inputSchema: z.object({
      model_url: z.string(),
      object_prompt: z.string(),
      style_prompt: z.string().optional(),
      enable_original_uv: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      resolution: z.string().optional(),
      negative_prompt: z.string().optional(),
      art_style: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/text-to-texture", args)),
);

server.registerTool(
  "retrieve_text_to_texture_task",
  {
    description: "Retrieve the status and result of a text-to-texture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/text-to-texture/${task_id}`)),
);

server.registerTool(
  "list_text_to_texture_tasks",
  {
    description: "List previously created text-to-texture tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/text-to-texture", { query: args })),
);

server.registerTool(
  "stream_text_to_texture_task",
  {
    description: "Stream updates for a text-to-texture task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/text-to-texture/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_remesh_task",
  {
    description: "Remesh and optimize an existing 3D model.",
    inputSchema: z.object({
      input_task_id: z.string(),
      target_formats: z.array(z.string()).optional(),
      topology: z.string().optional(),
      target_polycount: z.number().int().optional(),
      resize_height: z.number().optional(),
      origin_at: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await client.post("/v1/remesh", args)),
);

server.registerTool(
  "retrieve_remesh_task",
  {
    description: "Retrieve the status and result of a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "list_remesh_tasks",
  {
    description: "List previously created remesh tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/remesh", { query: args })),
);

server.registerTool(
  "stream_remesh_task",
  {
    description: "Stream updates for a remesh task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/remesh/${task_id}/stream`, timeout)),
);

const riggingPayloadSchema = z.object({}).passthrough();

server.registerTool(
  "create_rigging_task",
  {
    description: "Create a rigging job for a 3D model. Provide the request body defined in the Meshy rigging docs.",
    inputSchema: riggingPayloadSchema,
  },
  async (request) => jsonResponse(await client.post("/v1/rigging", request)),
);

server.registerTool(
  "retrieve_rigging_task",
  {
    description: "Retrieve the status of a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "list_rigging_tasks",
  {
    description: "List previously created rigging tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/rigging", { query: args })),
);

server.registerTool(
  "stream_rigging_task",
  {
    description: "Stream updates for a rigging task until it completes.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/rigging/${task_id}/stream`, timeout)),
);

const animationPayloadSchema = z
  .object({ action_id: z.coerce.number().int() })
  .passthrough();

server.registerTool(
  "create_animation_task",
  {
    description:
      "Create an animation task for a rigged model. The payload must include an action_id from the Meshy animation library.",
    inputSchema: animationPayloadSchema,
  },
  async (request) => jsonResponse(await client.post("/v1/animations", request)),
);

server.registerTool(
  "retrieve_animation_task",
  {
    description: "Retrieve the status or result of an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "list_animation_tasks",
  {
    description: "List animation tasks you have previously created.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/animations", { query: args })),
);

server.registerTool(
  "stream_animation_task",
  {
    description: "Stream updates for an animation task using server-sent events.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/animations/${task_id}/stream`, timeout)),
);

// --- Multi Image to 3D ---

server.registerTool(
  "create_multi_image_to_3d_task",
  {
    description: "Generate a 3D model from multiple input images.",
    inputSchema: z.object({
      image_urls: z.array(z.string()),
    }).passthrough(),
  },
  async (args) => jsonResponse(await client.post("/v1/multi-image-to-3d", args)),
);

server.registerTool(
  "retrieve_multi_image_to_3d_task",
  {
    description: "Retrieve the status and result of a multi-image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/multi-image-to-3d/${task_id}`)),
);

server.registerTool(
  "list_multi_image_to_3d_tasks",
  {
    description: "List previously created multi-image-to-3d tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/multi-image-to-3d", { query: args })),
);

server.registerTool(
  "stream_multi_image_to_3d_task",
  {
    description: "Stream updates for a multi-image-to-3d task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/multi-image-to-3d/${task_id}/stream`, timeout)),
);

// --- Retexture ---

server.registerTool(
  "create_retexture_task",
  {
    description: "Create a retexture task to apply new textures to an existing 3D model. Provide the request body as defined in the Meshy retexture docs.",
    inputSchema: z.object({}).passthrough(),
  },
  async (args) => jsonResponse(await client.post("/v1/retexture", args)),
);

server.registerTool(
  "retrieve_retexture_task",
  {
    description: "Retrieve the status and result of a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "list_retexture_tasks",
  {
    description: "List previously created retexture tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/retexture", { query: args })),
);

server.registerTool(
  "stream_retexture_task",
  {
    description: "Stream updates for a retexture task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/retexture/${task_id}/stream`, timeout)),
);

// --- Text to Image ---

server.registerTool(
  "create_text_to_image_task",
  {
    description: "Generate an image from a text prompt.",
    inputSchema: z.object({
      prompt: z.string(),
      art_style: z.string().optional(),
      negative_prompt: z.string().optional(),
      resolution: z.string().optional(),
    }).passthrough(),
  },
  async (args) => jsonResponse(await client.post("/v1/text-to-image", args)),
);

server.registerTool(
  "retrieve_text_to_image_task",
  {
    description: "Retrieve the status and result of a text-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/text-to-image/${task_id}`)),
);

server.registerTool(
  "list_text_to_image_tasks",
  {
    description: "List previously created text-to-image tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/text-to-image", { query: args })),
);

server.registerTool(
  "stream_text_to_image_task",
  {
    description: "Stream updates for a text-to-image task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/text-to-image/${task_id}/stream`, timeout)),
);

// --- Image to Image ---

server.registerTool(
  "create_image_to_image_task",
  {
    description: "Generate a new image from an input image and optional prompt.",
    inputSchema: z.object({
      image_url: z.string(),
      prompt: z.string().optional(),
      art_style: z.string().optional(),
      negative_prompt: z.string().optional(),
      resolution: z.string().optional(),
    }).passthrough(),
  },
  async (args) => jsonResponse(await client.post("/v1/image-to-image", args)),
);

server.registerTool(
  "retrieve_image_to_image_task",
  {
    description: "Retrieve the status and result of an image-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.get(`/v1/image-to-image/${task_id}`)),
);

server.registerTool(
  "list_image_to_image_tasks",
  {
    description: "List previously created image-to-image tasks.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page: z.number().int().optional(),
    }),
  },
  async (args = {}) => jsonResponse(await client.get("/v1/image-to-image", { query: args })),
);

server.registerTool(
  "stream_image_to_image_task",
  {
    description: "Stream updates for an image-to-image task.",
    inputSchema: z.object({
      task_id: z.string(),
      timeout: z.number().int().optional(),
    }),
  },
  async ({ task_id, timeout }) => jsonResponse(await client.stream(`/v1/image-to-image/${task_id}/stream`, timeout)),
);

// --- Delete endpoints ---

server.registerTool(
  "delete_text_to_3d_task",
  {
    description: "Delete a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_image_to_3d_task",
  {
    description: "Delete an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_multi_image_to_3d_task",
  {
    description: "Delete a multi-image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/multi-image-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_text_to_texture_task",
  {
    description: "Delete a text-to-texture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/text-to-texture/${task_id}`)),
);

server.registerTool(
  "delete_remesh_task",
  {
    description: "Delete a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "delete_rigging_task",
  {
    description: "Delete a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "delete_animation_task",
  {
    description: "Delete an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "delete_retexture_task",
  {
    description: "Delete a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "delete_text_to_image_task",
  {
    description: "Delete a text-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/text-to-image/${task_id}`)),
);

server.registerTool(
  "delete_image_to_image_task",
  {
    description: "Delete an image-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await client.delete(`/v1/image-to-image/${task_id}`)),
);

// --- Utility ---

server.registerTool(
  "get_balance",
  {
    description: "Retrieve your Meshy AI account balance.",
  },
  async () => jsonResponse(await client.get("/v1/balance")),
);

const transport = new StdioServerTransport();
await server.connect(transport);
