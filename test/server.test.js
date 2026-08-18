import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  createServer,
  isProcessEntrypoint,
  server,
  version,
} from "../dist/index.js";

const EXPECTED_TOOL_NAMES = [
  "create_text_to_3d_task",
  "retrieve_text_to_3d_task",
  "list_text_to_3d_tasks",
  "stream_text_to_3d_task",
  "delete_text_to_3d_task",
  "create_image_to_3d_task",
  "retrieve_image_to_3d_task",
  "list_image_to_3d_tasks",
  "stream_image_to_3d_task",
  "delete_image_to_3d_task",
  "create_multi_image_to_3d_task",
  "retrieve_multi_image_to_3d_task",
  "list_multi_image_to_3d_tasks",
  "stream_multi_image_to_3d_task",
  "delete_multi_image_to_3d_task",
  "create_text_to_texture_task",
  "retrieve_text_to_texture_task",
  "list_text_to_texture_tasks",
  "stream_text_to_texture_task",
  "delete_text_to_texture_task",
  "create_retexture_task",
  "retrieve_retexture_task",
  "list_retexture_tasks",
  "stream_retexture_task",
  "delete_retexture_task",
  "create_text_to_image_task",
  "retrieve_text_to_image_task",
  "list_text_to_image_tasks",
  "stream_text_to_image_task",
  "delete_text_to_image_task",
  "create_image_to_image_task",
  "retrieve_image_to_image_task",
  "list_image_to_image_tasks",
  "stream_image_to_image_task",
  "delete_image_to_image_task",
  "create_remesh_task",
  "retrieve_remesh_task",
  "list_remesh_tasks",
  "stream_remesh_task",
  "delete_remesh_task",
  "create_rigging_task",
  "retrieve_rigging_task",
  "list_rigging_tasks",
  "stream_rigging_task",
  "delete_rigging_task",
  "create_animation_task",
  "retrieve_animation_task",
  "list_animation_tasks",
  "stream_animation_task",
  "delete_animation_task",
  "get_balance",
];

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

async function connectTestClient(mcpServer = createServer()) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);
  return { client, mcpServer };
}

test("import and createServer do not connect stdio", () => {
  assert.equal(isProcessEntrypoint(), false);
  assert.ok(server);
  const extra = createServer();
  assert.ok(extra);
  assert.notEqual(extra, server);
});

test("advertised version matches package.json", async () => {
  assert.equal(version, packageJson.version);
  const { client } = await connectTestClient();
  const info = client.getServerVersion();
  assert.equal(info?.version, packageJson.version);
  assert.equal(info?.version, "1.2.2");
});

test("tools/list advertises all 51 expected tool names", async () => {
  const { client } = await connectTestClient();
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  assert.equal(names.length, 51);
  assert.deepEqual(names, [...EXPECTED_TOOL_NAMES].sort());
});

test("missing MESHY_API_KEY returns isError instead of crashing", async () => {
  const previous = process.env.MESHY_API_KEY;
  delete process.env.MESHY_API_KEY;
  try {
    const { client } = await connectTestClient();
    const result = await client.callTool({ name: "get_balance", arguments: {} });
    assert.equal(result.isError, true);
    const text = result.content.map((part) => ("text" in part ? part.text : "")).join("\n");
    assert.match(text, /MESHY_API_KEY/);
    assert.doesNotMatch(text, /Bearer /i);
  } finally {
    if (previous === undefined) {
      delete process.env.MESHY_API_KEY;
    } else {
      process.env.MESHY_API_KEY = previous;
    }
  }
});

test("Meshy HTTP errors become isError results and truncate huge bodies", async () => {
  const previousKey = process.env.MESHY_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.MESHY_API_KEY = "test-secret-key-do-not-leak";
  globalThis.fetch = async () =>
    new Response("BOOM".repeat(2000) + "test-secret-key-do-not-leak", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  try {
    const { client } = await connectTestClient();
    const result = await client.callTool({ name: "get_balance", arguments: {} });
    assert.equal(result.isError, true);
    const text = result.content.map((part) => ("text" in part ? part.text : "")).join("\n");
    assert.match(text, /Meshy API request failed \(500\)/);
    assert.match(text, /truncated/);
    assert.equal(text.includes("test-secret-key-do-not-leak"), false);
    assert.ok(text.length < 4000);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) {
      delete process.env.MESHY_API_KEY;
    } else {
      process.env.MESHY_API_KEY = previousKey;
    }
  }
});

test("package.json version is readable from compiled dist via createRequire", () => {
  const fromDist = createRequire(fileURLToPath(new URL("../dist/index.js", import.meta.url)))(
    "../package.json",
  );
  assert.equal(fromDist.version, packageJson.version);
  readFileSync(new URL("../package.json", import.meta.url));
});

test("create_text_to_texture_task maps onto retexture", async () => {
  const previousKey = process.env.MESHY_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.MESHY_API_KEY = "test-secret-key-do-not-leak";
  let captured;
  globalThis.fetch = async (url, init = {}) => {
    captured = { url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined };
    return new Response(JSON.stringify({ result: "ok" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const { client } = await connectTestClient();
    const result = await client.callTool({
      name: "create_text_to_texture_task",
      arguments: {
        model_url: "https://example.com/model.glb",
        object_prompt: "a wooden chair",
        style_prompt: "oak grain",
        enable_original_uv: true,
        enable_pbr: false,
        art_style: "realistic",
      },
    });
    assert.equal(result.isError, undefined);
    assert.match(captured.url, /\/v1\/retexture$/);
    assert.equal(captured.method, "POST");
    assert.deepEqual(captured.body, {
      model_url: "https://example.com/model.glb",
      text_style_prompt: "oak grain",
      enable_original_uv: true,
      enable_pbr: false,
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) {
      delete process.env.MESHY_API_KEY;
    } else {
      process.env.MESHY_API_KEY = previousKey;
    }
  }
});

test("stream SSE Invalid ID payload sets isError", async () => {
  const previousKey = process.env.MESHY_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.MESHY_API_KEY = "test-secret-key-do-not-leak";
  globalThis.fetch = async () =>
    new Response("data: " + JSON.stringify({ message: "Invalid ID", status_code: 400 }) + "\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  try {
    const { client } = await connectTestClient();
    const result = await client.callTool({
      name: "stream_text_to_3d_task",
      arguments: { task_id: "bad-id" },
    });
    assert.equal(result.isError, true);
    const text = result.content.map((part) => ("text" in part ? part.text : "")).join("\n");
    assert.match(text, /Meshy stream error \(400\): Invalid ID/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) {
      delete process.env.MESHY_API_KEY;
    } else {
      process.env.MESHY_API_KEY = previousKey;
    }
  }
});


const IMAGE_AI_MODELS = ["nano-banana", "nano-banana-2", "nano-banana-pro", "gpt-image-2"];

function toolSchema(mcpServer, name) {
  const tool = mcpServer._registeredTools[name];
  assert.ok(tool, `missing registered tool ${name}`);
  assert.ok(tool.inputSchema, `missing inputSchema for ${name}`);
  return tool.inputSchema;
}

function objectShape(schema) {
  let current = schema;
  for (let i = 0; i < 8 && current; i += 1) {
    if (current.shape) return current.shape;
    current = current._def && current._def.schema;
  }
  throw new Error("could not inspect tool schema shape");
}

test("image create tool schemas accept new models and extra fields", () => {
  const mcpServer = createServer();
  const t2i = toolSchema(mcpServer, "create_text_to_image_task");
  const i2i = toolSchema(mcpServer, "create_image_to_image_task");

  for (const ai_model of IMAGE_AI_MODELS) {
    assert.doesNotThrow(() => t2i.parse({ ai_model, prompt: "a dragon", remove_background: true, aspect_ratio: "1:1" }));
    assert.doesNotThrow(() => i2i.parse({
      ai_model,
      prompt: "make it cyberpunk",
      reference_image_urls: ["https://example.com/a.png"],
      remove_background: true,
      aspect_ratio: "3:2",
    }));
  }

  assert.throws(() => t2i.parse({ ai_model: "garbage-model", prompt: "a dragon" }));
  assert.throws(() => i2i.parse({
    ai_model: "not-a-model",
    prompt: "edit",
    reference_image_urls: ["https://example.com/a.png"],
  }));

  const t2iShape = objectShape(t2i);
  const i2iShape = objectShape(i2i);
  assert.ok(t2iShape.remove_background, "create_text_to_image_task is missing remove_background");
  assert.ok(i2iShape.remove_background, "create_image_to_image_task is missing remove_background");
  assert.ok(i2iShape.aspect_ratio, "create_image_to_image_task is missing aspect_ratio");
  assert.ok(t2iShape.aspect_ratio, "create_text_to_image_task is missing aspect_ratio");
});

test("create_text_to_3d_task preview schema includes model_type and ultra_mode", () => {
  const mcpServer = createServer();
  const schema = toolSchema(mcpServer, "create_text_to_3d_task");
  const shape = objectShape(schema);
  assert.ok(shape.model_type, "create_text_to_3d_task is missing model_type");
  assert.ok(shape.ultra_mode, "create_text_to_3d_task is missing ultra_mode");
  assert.doesNotThrow(() => schema.parse({
    mode: "preview",
    prompt: "a monster mask",
    ai_model: "meshy-7",
    model_type: "smart-topology",
    ultra_mode: true,
  }));
  assert.throws(() => schema.parse({
    mode: "preview",
    prompt: "a monster mask",
    model_type: "not-a-type",
  }));
});
