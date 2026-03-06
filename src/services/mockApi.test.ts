import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStocks } from "./mockApi";

describe("fetchStocks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests stocks with expected query params", async () => {
    const sample = [
      {
        id: "kis-005930",
        name: "삼성전자",
        symbol: "005930",
        market: "domestic" as const,
        price: 70000,
        change: 1.23,
        history: [],
      },
    ];
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(sample), { status: 200 }));

    const result = await fetchStocks("domestic", "volume");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/stocks?market=domestic&ranking=volume"
    );
    expect(result).toEqual(sample);
  });

  it("throws when API response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(fetchStocks("foreign", "tradeAmount")).rejects.toThrow(
      "실시간 주식 데이터를 불러오지 못했습니다."
    );
  });
});
