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
