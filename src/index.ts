#!/usr/bin/env node
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MeshyClient } from "./client.js";

dotenv.config({ quiet: true });

const apiKey = process.env.MESHY_API_KEY;
const apiBase = process.env.MESHY_API_BASE;
const parsedStreamTimeout = process.env.MESHY_STREAM_TIMEOUT_MS
  ? Number.parseInt(process.env.MESHY_STREAM_TIMEOUT_MS, 10)
  : undefined;
const streamTimeoutMs = Number.isFinite(parsedStreamTimeout) ? parsedStreamTimeout : undefined;

function getMeshyClient(): MeshyClient {
  if (!apiKey) {
    throw new Error("MESHY_API_KEY environment variable is not set");
  }
  return new MeshyClient(apiKey, { apiBase, streamTimeoutMs });
}

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
    description:
      "Generate a 3D model from a text prompt using a two-step workflow. " +
      "Step 1 – set mode='preview' to create a draft mesh (requires 'prompt'). " +
      "Step 2 – set mode='refine' with 'preview_task_id' pointing to a SUCCEEDED preview task to add textures. " +
      "ai_model accepts 'meshy-5', 'meshy-6', or 'latest'. " +
      "art_style accepts 'realistic' or 'sculpture' (deprecated for meshy-6). " +
      "topology accepts 'quad' or 'triangle'. " +
      "symmetry_mode accepts 'auto', 'on', or 'off'. " +
      "pose_mode accepts 'a-pose', 't-pose', or '' (empty string for none). " +
      "origin_at accepts 'bottom' or 'center'.",
    inputSchema: z.object({
      mode: z.enum(["preview", "refine"]),
      // preview-mode fields
      prompt: z.string().max(600).optional(),
      art_style: z.string().optional(),
      ai_model: z.string().optional(),
      topology: z.string().optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      should_remesh: z.boolean().optional(),
      symmetry_mode: z.string().optional(),
      pose_mode: z.string().optional(),
      target_formats: z.array(z.string()).optional(),
      auto_size: z.boolean().optional(),
      origin_at: z.string().optional(),
      // refine-mode fields
      preview_task_id: z.string().optional(),
      enable_pbr: z.boolean().optional(),
      texture_prompt: z.string().max(600).optional(),
      texture_image_url: z.string().optional(),
      remove_lighting: z.boolean().optional(),
    }).refine(
      (data) => data.mode !== "preview" || !!data.prompt,
      { message: "prompt is required when mode is 'preview'", path: ["prompt"] },
    ).refine(
      (data) => data.mode !== "refine" || !!data.preview_task_id,
      { message: "preview_task_id is required when mode is 'refine'", path: ["preview_task_id"] },
    ),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v2/text-to-3d", args)),
);

server.registerTool(
  "retrieve_text_to_3d_task",
  {
    description: "Retrieve the status and result of a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "list_text_to_3d_tasks",
  {
    description: "List previously created text-to-3d tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v2/text-to-3d", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v2/text-to-3d/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_image_to_3d_task",
  {
    description:
      "Generate a 3D model from an input image. " +
      "image_url must be a public URL or base64 data URI (.jpg/.jpeg/.png). " +
      "ai_model accepts 'meshy-5', 'meshy-6', or 'latest'. " +
      "topology accepts 'quad' or 'triangle'. " +
      "symmetry_mode accepts 'auto', 'on', or 'off'. " +
      "pose_mode accepts 'a-pose', 't-pose', or '' (empty). " +
      "Set should_texture=false to skip texturing and get a mesh only. " +
      "origin_at accepts 'bottom' or 'center'.",
    inputSchema: z.object({
      image_url: z.string(),
      ai_model: z.string().optional(),
      topology: z.string().optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      symmetry_mode: z.string().optional(),
      should_remesh: z.boolean().optional(),
      should_texture: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      pose_mode: z.string().optional(),
      texture_prompt: z.string().max(600).optional(),
      texture_image_url: z.string().optional(),
      target_formats: z.array(z.string()).optional(),
      auto_size: z.boolean().optional(),
      origin_at: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/image-to-3d", args)),
);

server.registerTool(
  "retrieve_image_to_3d_task",
  {
    description: "Retrieve the status and result of an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "list_image_to_3d_tasks",
  {
    description: "List previously created image-to-3d tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/image-to-3d", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/image-to-3d/${task_id}/stream`, timeout)),
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
  async (args) => jsonResponse(await getMeshyClient().post("/v1/text-to-texture", args)),
);

server.registerTool(
  "retrieve_text_to_texture_task",
  {
    description: "Retrieve the status and result of a text-to-texture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/text-to-texture/${task_id}`)),
);

server.registerTool(
  "list_text_to_texture_tasks",
  {
    description: "List previously created text-to-texture tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/text-to-texture", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/text-to-texture/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_remesh_task",
  {
    description:
      "Remesh and optimize an existing 3D model. " +
      "Provide either input_task_id (ID of a completed Meshy task) or model_url (public URL or data URI to a .glb/.gltf/.obj/.fbx/.stl file). " +
      "topology accepts 'quad' or 'triangle'. " +
      "origin_at accepts 'bottom' or 'center'. " +
      "Set convert_format_only=true to only convert the format without remeshing.",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      target_formats: z.array(z.string()).optional(),
      topology: z.string().optional(),
      target_polycount: z.number().int().optional(),
      resize_height: z.number().optional(),
      auto_size: z.boolean().optional(),
      origin_at: z.string().optional(),
      convert_format_only: z.boolean().optional(),
    }).refine(
      (data) => !!data.input_task_id || !!data.model_url,
      { message: "Either input_task_id or model_url must be provided" },
    ),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/remesh", args)),
);

server.registerTool(
  "retrieve_remesh_task",
  {
    description: "Retrieve the status and result of a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "list_remesh_tasks",
  {
    description: "List previously created remesh tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/remesh", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/remesh/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_rigging_task",
  {
    description:
      "Auto-rig a 3D character model for animation. " +
      "Provide either input_task_id (ID of a completed Meshy task) or model_url (public URL or data URI to a GLB file). " +
      "height_meters is the approximate character height in meters (default 1.7, range 0.1–15). " +
      "texture_image_url is an optional URL to the UV-unwrapped base color texture (PNG). " +
      "Note: auto-rigging works best on humanoid characters with a clear limb/body structure.",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      height_meters: z.number().min(0.1).max(15).optional(),
      texture_image_url: z.string().optional(),
    }).refine(
      (data) => !!data.input_task_id || !!data.model_url,
      { message: "Either input_task_id or model_url must be provided" },
    ),
  },
  async (request) => jsonResponse(await getMeshyClient().post("/v1/rigging", request)),
);

server.registerTool(
  "retrieve_rigging_task",
  {
    description: "Retrieve the status of a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "list_rigging_tasks",
  {
    description: "List previously created rigging tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/rigging", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/rigging/${task_id}/stream`, timeout)),
);

server.registerTool(
  "create_animation_task",
  {
    description:
      "Apply an animation to a rigged character. " +
      "rig_task_id is the ID of a completed rigging task (required). " +
      "action_id is the animation action identifier from the Meshy animation library (see https://docs.meshy.ai/en/api/animation-library). " +
      "post_process is optional and can contain {operation_type: 'change_fps'|'fbx2usdz'|'extract_armature', fps?: 24|25|30|60}.",
    inputSchema: z.object({
      rig_task_id: z.string(),
      action_id: z.coerce.number().int(),
      post_process: z.object({
        operation_type: z.enum(["change_fps", "fbx2usdz", "extract_armature"]),
        fps: z.number().int().optional(),
      }).optional(),
    }),
  },
  async (request) => jsonResponse(await getMeshyClient().post("/v1/animations", request)),
);

server.registerTool(
  "retrieve_animation_task",
  {
    description: "Retrieve the status or result of an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "list_animation_tasks",
  {
    description: "List animation tasks you have previously created. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/animations", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/animations/${task_id}/stream`, timeout)),
);

// --- Multi Image to 3D ---

server.registerTool(
  "create_multi_image_to_3d_task",
  {
    description:
      "Generate a 3D model from 1–4 input images. " +
      "image_urls must be an array of 1–4 public URLs or base64 data URIs (.jpg/.jpeg/.png). " +
      "ai_model accepts 'meshy-5', 'meshy-6', or 'latest'. " +
      "topology accepts 'quad' or 'triangle'. " +
      "symmetry_mode accepts 'auto', 'on', or 'off'. " +
      "pose_mode accepts 'a-pose', 't-pose', or '' (empty). " +
      "Set should_texture=false to skip texturing and get a mesh only. " +
      "origin_at accepts 'bottom' or 'center'.",
    inputSchema: z.object({
      image_urls: z.array(z.string()).min(1).max(4),
      ai_model: z.string().optional(),
      topology: z.string().optional(),
      target_polycount: z.number().int().min(100).max(300000).optional(),
      symmetry_mode: z.string().optional(),
      should_remesh: z.boolean().optional(),
      should_texture: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      pose_mode: z.string().optional(),
      texture_prompt: z.string().max(600).optional(),
      texture_image_url: z.string().optional(),
      target_formats: z.array(z.string()).optional(),
      auto_size: z.boolean().optional(),
      origin_at: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/multi-image-to-3d", args)),
);

server.registerTool(
  "retrieve_multi_image_to_3d_task",
  {
    description: "Retrieve the status and result of a multi-image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/multi-image-to-3d/${task_id}`)),
);

server.registerTool(
  "list_multi_image_to_3d_tasks",
  {
    description: "List previously created multi-image-to-3d tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/multi-image-to-3d", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/multi-image-to-3d/${task_id}/stream`, timeout)),
);

// --- Retexture ---

server.registerTool(
  "create_retexture_task",
  {
    description:
      "Apply new textures to a 3D model using text or image style guidance. " +
      "Provide either input_task_id (ID of a completed Meshy task) or model_url (public URL or data URI to a .glb/.gltf/.obj/.fbx/.stl file). " +
      "Provide either text_style_prompt (up to 600 chars) or image_style_url to guide the texture style; these are mutually exclusive. " +
      "ai_model accepts 'meshy-5', 'meshy-6', or 'latest'. " +
      "enable_original_uv (default true) preserves existing UV mapping. " +
      "enable_pbr generates additional PBR maps (metallic, roughness, normal).",
    inputSchema: z.object({
      input_task_id: z.string().optional(),
      model_url: z.string().optional(),
      text_style_prompt: z.string().max(600).optional(),
      image_style_url: z.string().optional(),
      ai_model: z.string().optional(),
      enable_original_uv: z.boolean().optional(),
      enable_pbr: z.boolean().optional(),
      remove_lighting: z.boolean().optional(),
      target_formats: z.array(z.string()).optional(),
    }).refine(
      (data) => !!data.input_task_id || !!data.model_url,
      { message: "Either input_task_id or model_url must be provided" },
    ).refine(
      (data) => !!data.text_style_prompt || !!data.image_style_url,
      { message: "Either text_style_prompt or image_style_url must be provided" },
    ).refine(
      (data) => !(data.text_style_prompt && data.image_style_url),
      { message: "text_style_prompt and image_style_url are mutually exclusive; provide only one" },
    ),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/retexture", args)),
);

server.registerTool(
  "retrieve_retexture_task",
  {
    description: "Retrieve the status and result of a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "list_retexture_tasks",
  {
    description: "List previously created retexture tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/retexture", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/retexture/${task_id}/stream`, timeout)),
);

// --- Text to Image ---

server.registerTool(
  "create_text_to_image_task",
  {
    description:
      "Generate an image from a text prompt. " +
      "ai_model is required and accepts 'nano-banana' or 'nano-banana-pro'. " +
      "aspect_ratio accepts '1:1', '16:9', '9:16', '4:3', or '3:4' (default '1:1'). " +
      "pose_mode accepts 'a-pose' or 't-pose'. " +
      "Set generate_multi_view=true to generate multi-angle views (cannot be combined with aspect_ratio).",
    inputSchema: z.object({
      ai_model: z.enum(["nano-banana", "nano-banana-pro"]),
      prompt: z.string(),
      generate_multi_view: z.boolean().optional(),
      pose_mode: z.string().optional(),
      aspect_ratio: z.string().optional(),
    }),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/text-to-image", args)),
);

server.registerTool(
  "retrieve_text_to_image_task",
  {
    description: "Retrieve the status and result of a text-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/text-to-image/${task_id}`)),
);

server.registerTool(
  "list_text_to_image_tasks",
  {
    description: "List previously created text-to-image tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/text-to-image", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/text-to-image/${task_id}/stream`, timeout)),
);

// --- Image to Image ---

server.registerTool(
  "create_image_to_image_task",
  {
    description:
      "Generate a new image based on reference images and a text prompt. " +
      "ai_model is required and accepts 'nano-banana' or 'nano-banana-pro'. " +
      "reference_image_urls is required: an array of 1–5 public URLs or base64 data URIs. " +
      "prompt describes the transformation. " +
      "Set generate_multi_view=true to generate multi-angle views.",
    inputSchema: z.object({
      ai_model: z.enum(["nano-banana", "nano-banana-pro"]),
      prompt: z.string(),
      reference_image_urls: z.array(z.string()).min(1).max(5),
      generate_multi_view: z.boolean().optional(),
    }),
  },
  async (args) => jsonResponse(await getMeshyClient().post("/v1/image-to-image", args)),
);

server.registerTool(
  "retrieve_image_to_image_task",
  {
    description: "Retrieve the status and result of an image-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().get(`/v1/image-to-image/${task_id}`)),
);

server.registerTool(
  "list_image_to_image_tasks",
  {
    description: "List previously created image-to-image tasks. sort_by accepts '+created_at' or '-created_at'.",
    inputSchema: z.object({
      page_size: z.number().int().optional(),
      page_num: z.number().int().optional(),
      sort_by: z.enum(["+created_at", "-created_at"]).optional(),
    }),
  },
  async (args = {}) => jsonResponse(await getMeshyClient().get("/v1/image-to-image", { query: args })),
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
  async ({ task_id, timeout }) => jsonResponse(await getMeshyClient().stream(`/v1/image-to-image/${task_id}/stream`, timeout)),
);

// --- Delete endpoints ---

server.registerTool(
  "delete_text_to_3d_task",
  {
    description: "Delete a text-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v2/text-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_image_to_3d_task",
  {
    description: "Delete an image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/image-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_multi_image_to_3d_task",
  {
    description: "Delete a multi-image-to-3d task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/multi-image-to-3d/${task_id}`)),
);

server.registerTool(
  "delete_text_to_texture_task",
  {
    description: "Delete a text-to-texture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/text-to-texture/${task_id}`)),
);

server.registerTool(
  "delete_remesh_task",
  {
    description: "Delete a remesh task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/remesh/${task_id}`)),
);

server.registerTool(
  "delete_rigging_task",
  {
    description: "Delete a rigging task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/rigging/${task_id}`)),
);

server.registerTool(
  "delete_animation_task",
  {
    description: "Delete an animation task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/animations/${task_id}`)),
);

server.registerTool(
  "delete_retexture_task",
  {
    description: "Delete a retexture task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/retexture/${task_id}`)),
);

server.registerTool(
  "delete_text_to_image_task",
  {
    description: "Delete a text-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/text-to-image/${task_id}`)),
);

server.registerTool(
  "delete_image_to_image_task",
  {
    description: "Delete an image-to-image task.",
    inputSchema: z.object({ task_id: z.string() }),
  },
  async ({ task_id }) => jsonResponse(await getMeshyClient().delete(`/v1/image-to-image/${task_id}`)),
);

// --- Utility ---

server.registerTool(
  "get_balance",
  {
    description: "Retrieve your Meshy AI account balance.",
  },
  async () => jsonResponse(await getMeshyClient().get("/v1/balance")),
);

const transport = new StdioServerTransport();
await server.connect(transport);
