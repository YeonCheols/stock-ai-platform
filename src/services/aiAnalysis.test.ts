import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildUserPrompt, fetchNewsContext } from "./aiAnalysis";

describe("aiAnalysis", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SERPAPI_KEY;
    delete process.env.BING_NEWS_KEY;
  });

  it("buildUserPrompt includes symbol, price, and history", () => {
    const prompt = buildUserPrompt(
      "AAPL",
      {
        currentPrice: 190.5,
        change: 1.1,
        history: [
          { date: "2026-03-01", value: 187 },
          { date: "2026-03-02", value: 190 },
        ],
      },
      ["Apple AI news"]
    );

    expect(prompt).toContain("symbol: AAPL");
    expect(prompt).toContain("currentPrice: 190.5");
    expect(prompt).toContain("history: 2026-03-01:187, 2026-03-02:190");
    expect(prompt).toContain("newsContext: Apple AI news");
  });

  it("returns SerpApi titles first when available", async () => {
    process.env.SERPAPI_KEY = "serp-key";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          news_results: [{ title: "Serp headline 1" }, { title: "Serp headline 2" }],
        }),
        { status: 200 }
      )
    );

    const result = await fetchNewsContext("TSLA");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["Serp headline 1", "Serp headline 2"]);
  });

  it("falls back to default context when all providers fail", async () => {
    process.env.SERPAPI_KEY = "serp-key";
    process.env.BING_NEWS_KEY = "bing-key";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    const result = await fetchNewsContext("MSFT");

    expect(result).toEqual([
      "시장 전반 변동성 확대",
      "수급 변화에 따른 단기 가격 등락",
      "리스크 관리 필요성 부각",
    ]);
  });

  it("falls back to Bing when SerpApi has no usable result", async () => {
    process.env.SERPAPI_KEY = "serp-key";
    process.env.BING_NEWS_KEY = "bing-key";
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            value: [{ name: "Bing headline 1" }, { name: "Bing headline 2" }],
          }),
          { status: 200 }
        )
      );

    const result = await fetchNewsContext("NVDA");

    expect(result).toEqual(["Bing headline 1", "Bing headline 2"]);
  });

  it("falls back to Yahoo parsing when Serp/Bing are unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          news: [{ title: "Yahoo title 1" }, { title: "Yahoo title 2" }],
        }),
        { status: 200 }
      )
    );

    const result = await fetchNewsContext("AMZN");

    expect(result).toEqual(["Yahoo title 1", "Yahoo title 2"]);
  });
});
