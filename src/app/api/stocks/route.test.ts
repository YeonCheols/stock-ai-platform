import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchDomesticStocksFromKis: vi.fn(),
  fetchForeignStocksFromKis: vi.fn(),
  groqCreate: vi.fn(),
}));

vi.mock("@/services/kisApi", () => ({
  fetchDomesticStocksFromKis: mocks.fetchDomesticStocksFromKis,
  fetchForeignStocksFromKis: mocks.fetchForeignStocksFromKis,
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

import { GET } from "./route";

describe("GET /api/stocks", () => {
  beforeEach(() => {
    mocks.fetchDomesticStocksFromKis.mockReset();
    mocks.fetchForeignStocksFromKis.mockReset();
    mocks.groqCreate.mockReset();
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it("returns domestic stocks from KIS", async () => {
    mocks.fetchDomesticStocksFromKis.mockResolvedValue([
      {
        id: "kis-005930",
        name: "삼성전자",
        symbol: "005930",
        market: "domestic",
        price: 70000,
        change: 1.12,
        history: [],
      },
    ]);

    const res = await GET(
      new Request("http://localhost:3000/api/stocks?market=domestic&ranking=volume")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Stock-Source")).toBe("kis");
    expect(mocks.fetchDomesticStocksFromKis).toHaveBeenCalledWith("volume");
    expect(body).toHaveLength(1);
  });

  it("returns 503 when domestic KIS call fails", async () => {
    mocks.fetchDomesticStocksFromKis.mockRejectedValue(
      new Error(
        JSON.stringify({
          status: 500,
          body: JSON.stringify({ msg: "rate limited" }),
        })
      )
    );

    const res = await GET(
      new Request("http://localhost:3000/api/stocks?market=domestic&ranking=tradeAmount")
    );
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get("X-Stock-Source")).toBe("error");
    expect(body.source).toBe("kis");
    expect(body.detailBody).toEqual({ msg: "rate limited" });
  });

  it("falls back to Groq path when market query is omitted", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              stocks: [
                {
                  id: "stk-1",
                  symbol: "AAA",
                  name: "Alpha",
                  market: "domestic",
                  price: 100,
                  change: 2.5,
                  history: [{ date: "2026-03-01", value: 100 }],
                },
              ],
            }),
          },
        },
      ],
    });

    const res = await GET(new Request("http://localhost:3000/api/stocks"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Stock-Source")).toBe("groq");
    expect(body[0].symbol).toBe("AAA");
  });

  it("returns 503 when foreign KIS call fails", async () => {
    mocks.fetchForeignStocksFromKis.mockRejectedValue(
      new Error(
        JSON.stringify({
          status: 500,
          body: JSON.stringify({ msg: "foreign rate limited" }),
        })
      )
    );

    const res = await GET(
      new Request("http://localhost:3000/api/stocks?market=foreign&ranking=volume")
    );
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.get("X-Stock-Source")).toBe("error");
    expect(body.source).toBe("kis");
    expect(body.detailBody).toEqual({ msg: "foreign rate limited" });
  });

  it("returns 503 when Groq returns empty stocks", async () => {
    process.env.GROQ_API_KEY = "test-key";
    mocks.groqCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ stocks: [] }) } }],
    });

    const res = await GET(new Request("http://localhost:3000/api/stocks"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(res.headers.get("X-Stock-Source")).toBe("error");
    expect(body.source).toBe("groq");
    expect(body.error).toContain("Groq 응답에 종목 데이터가 없습니다.");
  });
});
