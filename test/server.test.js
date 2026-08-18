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
