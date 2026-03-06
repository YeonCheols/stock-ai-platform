import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchNewsContext: vi.fn(),
  buildUserPrompt: vi.fn(),
  groqCreate: vi.fn(),
}));

vi.mock("@/services/aiAnalysis", () => ({
  MODEL_NAME: "llama-3.3-70b-versatile",
  systemPrompt: "system prompt",
  fetchNewsContext: mocks.fetchNewsContext,
  buildUserPrompt: mocks.buildUserPrompt,
}));

vi.mock("groq-sdk", () => ({
  default: class GroqMock {
    chat = {
      completions: {
        create: mocks.groqCreate,
      },
    };
  },
}));

import { POST } from "./route";

describe("POST /api/stock-analysis", () => {
  beforeEach(() => {
    mocks.fetchNewsContext.mockReset();
    mocks.buildUserPrompt.mockReset();
    mocks.groqCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it("returns 500 when GROQ key is missing", async () => {
    const req = new Request("http://localhost:3000/api/stock-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        priceData: { currentPrice: 100, change: 1, history: [] },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("Missing GROQ_API_KEY");
  });

  it("returns 400 for invalid request body", async () => {
    process.env.GROQ_API_KEY = "test-key";
    const req = new Request("http://localhost:3000/api/stock-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid request");
  });

  it("streams Groq response chunks", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mocks.fetchNewsContext.mockResolvedValue(["news"]);
    mocks.buildUserPrompt.mockReturnValue("user prompt");

    mocks.groqCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: '{"sentiment":"Bullish",' } }] };
        yield { choices: [{ delta: { content: '"summary":"ok"}' } }] };
      })()
    );

    const req = new Request("http://localhost:3000/api/stock-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        priceData: { currentPrice: 100, change: 1, history: [] },
      }),
    });

    const res = await POST(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");
    expect(text).toBe('{"sentiment":"Bullish","summary":"ok"}');
  });

  it("returns mapped status/body when Groq request fails", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mocks.fetchNewsContext.mockResolvedValue(["news"]);
    mocks.buildUserPrompt.mockReturnValue("user prompt");
    mocks.groqCreate.mockRejectedValue({ status: 429, message: "rate limit" });

    const req = new Request("http://localhost:3000/api/stock-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        priceData: { currentPrice: 100, change: 1, history: [] },
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(await res.text()).toBe("rate limit");
  });
});
