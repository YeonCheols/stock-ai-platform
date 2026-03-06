import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Stock } from "@/types/stock";
import { useStockDetail } from "./useStockDetail";

const stock: Stock = {
  id: "kis-005930",
  name: "삼성전자",
  symbol: "005930",
  market: "domestic",
  price: 70000,
  change: 1.1,
  history: [{ date: "2026-03-05", value: 70000 }],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useStockDetail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams analysis and returns parsed data", async () => {
    const payload =
      '{"sentiment":"Bullish","summary":"ok","factorsUp":[],"factorsDown":[],"risks":[],"momentum":"strong","newsSummary":[]}';
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(payload));
            controller.close();
          },
        }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useStockDetail(stock), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.summary).toBe("ok");
    });
    expect(result.current.streamingText).toContain('"sentiment":"Bullish"');
    expect(result.current.isStreaming).toBe(false);
  });

  it("resets streaming state when request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("fail", { status: 500 }));

    const { result } = renderHook(() => useStockDetail(stock), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it("handles response without readable body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const { result } = renderHook(() => useStockDetail(stock), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.isStreaming).toBe(false);
  });
});
