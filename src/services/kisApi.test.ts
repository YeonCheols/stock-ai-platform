import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("kisApi token issuance", () => {
  beforeEach(() => {
    process.env.KIS_APP_KEY = "test-key";
    process.env.KIS_APP_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("deduplicates token issuance for concurrent requests", async () => {
    let tokenCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        tokenCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 86400 }),
          { status: 200 }
        );
      }
      if (url.includes("/overseas-stock/v1/ranking/trade-vol")) {
        return new Response(
          JSON.stringify({
            output: [{ ovrs_pdno: "AAPL", name: "Apple", last: "190.12" }],
          }),
          { status: 200 }
        );
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchForeignStocksFromKis } = await import("./kisApi");
    await Promise.all([fetchForeignStocksFromKis(), fetchForeignStocksFromKis()]);

    expect(tokenCalls).toBe(1);
  });

  it("reissues token when expires_in is immediate", async () => {
    let tokenCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        tokenCalls += 1;
        return new Response(
          JSON.stringify({ access_token: `token-${tokenCalls}`, expires_in: 0 }),
          { status: 200 }
        );
      }
      if (url.includes("/overseas-stock/v1/ranking/trade-vol")) {
        return new Response(
          JSON.stringify({
            output: [{ ovrs_pdno: "MSFT", name: "Microsoft", last: "410.5" }],
          }),
          { status: 200 }
        );
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchForeignStocksFromKis } = await import("./kisApi");
    await fetchForeignStocksFromKis();
    await fetchForeignStocksFromKis();

    expect(tokenCalls).toBe(2);
  });

  it("throws when KIS credentials are missing", async () => {
    delete process.env.KIS_APP_KEY;
    delete process.env.KIS_APP_SECRET;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));

    const { fetchForeignStocksFromKis } = await import("./kisApi");
    await expect(fetchForeignStocksFromKis()).rejects.toThrow(
      "KIS_APP_KEY 또는 KIS_APP_SECRET이 없습니다."
    );
  });

  it("throws when token endpoint fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        return new Response("token failed", { status: 500 });
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchForeignStocksFromKis } = await import("./kisApi");
    await expect(fetchForeignStocksFromKis()).rejects.toThrow("oauth2/tokenP");
  });

  it("throws when overseas ranking response is empty", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        return new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 86400 }),
          { status: 200 }
        );
      }
      if (url.includes("/overseas-stock/v1/ranking/trade-vol")) {
        return new Response(JSON.stringify({ output: [] }), { status: 200 });
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchForeignStocksFromKis } = await import("./kisApi");
    await expect(fetchForeignStocksFromKis()).rejects.toThrow(
      "해외 거래량순위 리스트가 비어 있습니다."
    );
  });

  it("fetches domestic stock with name fallback and parsed history", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        return new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 86400 }),
          { status: 200 }
        );
      }
      if (url.includes("/quotations/volume-rank")) {
        return new Response(
          JSON.stringify({ output: [{ stck_shrn_iscd: "005930", acml_tr_pbmn: "100" }] }),
          { status: 200 }
        );
      }
      if (url.includes("/quotations/inquire-price")) {
        return new Response(
          JSON.stringify({
            output: { stck_prpr: "70000", prdy_ctrt: "1.23", hts_kor_isnm: "" },
          }),
          { status: 200 }
        );
      }
      if (url.includes("/quotations/search-stock-info")) {
        return new Response(
          JSON.stringify({ output: { prdt_name: "삼성전자" } }),
          { status: 200 }
        );
      }
      if (url.includes("/quotations/inquire-daily-itemchartprice")) {
        return new Response(
          JSON.stringify({
            output2: [
              { stck_bsop_date: "20260301", stck_clpr: "69000" },
              { stck_bsop_date: "20260302", stck_clpr: "70000" },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchDomesticStocksFromKis } = await import("./kisApi");
    const result = await fetchDomesticStocksFromKis("volume");

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("삼성전자");
    expect(result[0]?.price).toBe(70000);
    expect(result[0]?.history).toEqual([
      { date: "2026-03-01", value: 69000 },
      { date: "2026-03-02", value: 70000 },
    ]);
  });

  it("throws when domestic ranking symbols are empty", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/oauth2/tokenP")) {
        return new Response(
          JSON.stringify({ access_token: "token-1", expires_in: 86400 }),
          { status: 200 }
        );
      }
      if (url.includes("/quotations/volume-rank")) {
        return new Response(JSON.stringify({ output: [] }), { status: 200 });
      }
      return new Response("not-found", { status: 404 });
    });

    const { fetchDomesticStocksFromKis } = await import("./kisApi");
    await expect(fetchDomesticStocksFromKis("tradeAmount")).rejects.toThrow(
      "KIS 거래량순위 리스트가 비어 있습니다."
    );
  });
});
