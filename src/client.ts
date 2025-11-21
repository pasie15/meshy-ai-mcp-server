import { setTimeout as delay } from "timers/promises";

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  acceptStream?: boolean;
}

export interface MeshyClientOptions {
  apiBase?: string;
  streamTimeoutMs?: number;
}

export class MeshyClient {
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly defaultStreamTimeoutMs: number;

  constructor(apiKey: string, { apiBase, streamTimeoutMs }: MeshyClientOptions = {}) {
    this.apiKey = apiKey;
    this.apiBase = (apiBase ?? "https://api.meshy.ai/openapi").replace(/\/$/, "");
    this.defaultStreamTimeoutMs = streamTimeoutMs ?? 300_000;
  }

  async get(path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = this.buildUrl(path, options.query);
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers(options.acceptStream),
      signal: this.buildAbortSignal(options.timeoutMs),
    });

    await this.ensureOk(response, url);
    return response.json();
  }

  async post(path: string, body: unknown, options: RequestOptions = {}): Promise<unknown> {
    const url = this.buildUrl(path, options.query);
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers(options.acceptStream),
      body: JSON.stringify(body),
      signal: this.buildAbortSignal(options.timeoutMs),
    });

    await this.ensureOk(response, url);
    return response.json();
  }

  async stream(path: string, timeoutMs?: number): Promise<unknown> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers(true),
      signal: this.buildAbortSignal(timeoutMs ?? this.defaultStreamTimeoutMs),
    });

    await this.ensureOk(response, url);

    if (!response.body) {
      throw new Error("Streaming response did not include a body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalPayload: unknown = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim().startsWith("data:")) {
          continue;
        }

        const payload = line.replace(/^data:\s*/, "");
        try {
          finalPayload = JSON.parse(payload);
        } catch (error) {
          finalPayload = { error: "Failed to parse stream payload", raw: payload, details: String(error) };
        }

        if (
          typeof finalPayload === "object" &&
          finalPayload !== null &&
          "status" in finalPayload &&
          typeof (finalPayload as Record<string, unknown>).status === "string"
        ) {
          const status = (finalPayload as { status: string }).status;
          if (["SUCCEEDED", "FAILED", "CANCELED"].includes(status)) {
            await reader.cancel();
            return finalPayload;
          }
        }
      }
    }

    return finalPayload ?? { error: "No data received from stream" };
  }

  private headers(acceptStream = false): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (acceptStream) {
      headers["Accept"] = "text/event-stream";
    }

    return headers;
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.apiBase}${normalized}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async ensureOk(response: Response, url: string) {
    if (response.ok) return;

    let bodyText = "";
    try {
      bodyText = await response.text();
    } catch (error) {
      bodyText = `Failed to read response body: ${String(error)}`;
    }

    throw new Error(`Meshy API request failed (${response.status}) for ${url}: ${bodyText}`);
  }

  private buildAbortSignal(timeoutMs?: number): AbortSignal | undefined {
    if (!timeoutMs) return undefined;
    const controller = new AbortController();

    delay(timeoutMs).then(() => controller.abort()).catch(() => undefined);
    return controller.signal;
  }
}
