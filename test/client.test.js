import assert from "node:assert/strict";
import { test } from "node:test";
import { MeshyClient, MAX_ERROR_BODY_CHARS, truncateErrorBody } from "../dist/client.js";

function jsonResponse(body, status = 200) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("truncateErrorBody shortens huge Meshy error payloads", () => {
  const huge = "x".repeat(MAX_ERROR_BODY_CHARS + 50);
  const truncated = truncateErrorBody(huge);
  assert.ok(truncated.length < huge.length);
  assert.match(truncated, /truncated 50 chars/);
});

test("GET and DELETE omit Content-Type; POST sets it", async () => {
  const captured = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    captured.push({ url: String(url), method: init.method, headers: init.headers });
    if (init.method === "DELETE") {
      return new Response("", { status: 200 });
    }
    return jsonResponse({ ok: true });
  };
  try {
    const client = new MeshyClient("secret-token");
    await client.get("/v1/balance");
    await client.post("/v1/image-to-3d", { image_url: "https://example.com/a.png" });
    await client.delete("/v1/image-to-3d/abc");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(captured.length, 3);
  const getHeaders = captured[0].headers;
  const postHeaders = captured[1].headers;
  const deleteHeaders = captured[2].headers;
  assert.equal(getHeaders["Content-Type"], undefined);
  assert.equal(deleteHeaders["Content-Type"], undefined);
  assert.equal(postHeaders["Content-Type"], "application/json");
  assert.equal(getHeaders.Authorization, "Bearer secret-token");
});

test("Meshy HTTP errors truncate body and redact the API key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    jsonResponse("FAIL" + "n".repeat(3000) + "secret-token", 502);
  try {
    const client = new MeshyClient("secret-token");
    await assert.rejects(
      () => client.get("/v1/balance"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Meshy API request failed \(502\)/);
        assert.match(error.message, /truncated/);
        assert.equal(error.message.includes("secret-token"), false);
        assert.ok(error.message.length < MAX_ERROR_BODY_CHARS + 200);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});


function sseResponse(events, status = 200) {
  const body = events
    .map((event) => `data: ${typeof event === "string" ? event : JSON.stringify(event)}\n\n`)
    .join("");
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

test("stream treats HTTP 200 SSE status_code >= 400 as an error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => sseResponse([{ message: "Invalid ID", status_code: 400 }]);
  try {
    const client = new MeshyClient("secret-token");
    await assert.rejects(
      () => client.stream("/v1/retexture/bad-id/stream"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Meshy stream error \(400\): Invalid ID/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stream treats FAILED SSE payloads with an error message as an error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    sseResponse([
      { status: "IN_PROGRESS", progress: 10 },
      { status: "FAILED", task_error: { message: "texture bake failed" } },
    ]);
  try {
    const client = new MeshyClient("secret-token");
    await assert.rejects(
      () => client.stream("/v1/retexture/task-1/stream"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Meshy stream FAILED: texture bake failed/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stream treats CANCELED SSE payloads with an error message as an error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => sseResponse([{ status: "CANCELED", message: "canceled by user" }]);
  try {
    const client = new MeshyClient("secret-token");
    await assert.rejects(
      () => client.stream("/v1/image-to-3d/task-1/stream"),
      (error) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /Meshy stream CANCELED: canceled by user/);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stream still returns SUCCEEDED SSE payloads", async () => {
  const originalFetch = globalThis.fetch;
  const succeeded = { status: "SUCCEEDED", id: "task-ok", model_urls: { glb: "https://example.com/a.glb" } };
  globalThis.fetch = async () =>
    sseResponse([{ status: "IN_PROGRESS", progress: 50 }, succeeded]);
  try {
    const client = new MeshyClient("secret-token");
    const result = await client.stream("/v2/text-to-3d/task-ok/stream");
    assert.deepEqual(result, succeeded);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
