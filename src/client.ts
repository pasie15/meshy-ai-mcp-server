export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  acceptStream?: boolean;
}

export interface MeshyClientOptions {
  apiBase?: string;
  streamTimeoutMs?: number;
}

export const MAX_ERROR_BODY_CHARS = 2048;

export function truncateErrorBody(text: string, max = MAX_ERROR_BODY_CHARS): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max)}… [truncated ${text.length - max} chars]`;
}

function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join("[redacted]");
}


function streamErrorMessage(payload: Record<string, unknown>): string | undefined {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error;
  }
  const taskError = payload.task_error;
  if (typeof taskError === "string" && taskError.trim()) {
    return taskError;
  }
  if (typeof taskError === "object" && taskError !== null) {
    const nested = (taskError as Record<string, unknown>).message;
    if (typeof nested === "string" && nested.trim()) {
      return nested;
    }
  }
  return undefined;
}

export function throwIfStreamPayloadError(payload: unknown): void {
  if (typeof payload !== "object" || payload === null) {
    return;
  }
  const rec = payload as Record<string, unknown>;
  const statusCode = rec.status_code;
  if (typeof statusCode === "number" && statusCode >= 400) {
    const message = streamErrorMessage(rec) ?? JSON.stringify(payload);
    throw new Error(`Meshy stream error (${statusCode}): ${message}`);
  }

  const status = rec.status;
  if (status === "FAILED" || status === "CANCELED") {
    const message = streamErrorMessage(rec);
    if (message) {
      throw new Error(`Meshy stream ${status}: ${message}`);
    }
  }
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
      headers: this.headers({ acceptStream: options.acceptStream }),
      signal: this.buildAbortSignal(options.timeoutMs),
    });

    await this.ensureOk(response, url);
    return response.json();
  }

  async delete(path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = this.buildUrl(path, options.query);
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.headers(),
      signal: this.buildAbortSignal(options.timeoutMs),
    });

    await this.ensureOk(response, url);
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  }

  async post(path: string, body: unknown, options: RequestOptions = {}): Promise<unknown> {
    const url = this.buildUrl(path, options.query);
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers({ jsonBody: true, acceptStream: options.acceptStream }),
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
      headers: this.headers({ acceptStream: true }),
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

    try {
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

          throwIfStreamPayloadError(finalPayload);

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

      const trailing = buffer.trim();
      if (trailing.startsWith("data:")) {
        const payload = trailing.replace(/^data:\s*/, "");
        try {
          finalPayload = JSON.parse(payload);
        } catch (error) {
          finalPayload = { error: "Failed to parse stream payload", raw: payload, details: String(error) };
        }
        throwIfStreamPayloadError(finalPayload);
      }
    } catch (error) {
      try {
        await reader.cancel();
      } catch {
        // already canceled or released
      }
      throw error;
    }

    throwIfStreamPayloadError(finalPayload);
    return finalPayload ?? { error: "No data received from stream" };
  }

  private headers(options: { jsonBody?: boolean; acceptStream?: boolean } = {}): HeadersInit {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (options.jsonBody) {
      headers["Content-Type"] = "application/json";
    }

    if (options.acceptStream) {
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

    const safeUrl = redactSecret(url, this.apiKey);
    const safeBody = truncateErrorBody(redactSecret(bodyText, this.apiKey));
    throw new Error(`Meshy API request failed (${response.status}) for ${safeUrl}: ${safeBody}`);
  }

  private buildAbortSignal(timeoutMs?: number): AbortSignal | undefined {
    if (!timeoutMs) return undefined;
    return AbortSignal.timeout(timeoutMs);
  }
}
