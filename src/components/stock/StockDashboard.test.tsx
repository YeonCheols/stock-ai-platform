import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stock } from "@/types/stock";

const mocks = vi.hoisted(() => ({
  useStocks: vi.fn(),
  useStockDetail: vi.fn(),
  refetch: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useStocks", () => ({
  useStocks: mocks.useStocks,
}));

vi.mock("@/hooks/useStockDetail", () => ({
  useStockDetail: mocks.useStockDetail,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

import StockDashboard from "./StockDashboard";

const renderDashboard = (market: "domestic" | "foreign") => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <StockDashboard market={market} />
    </QueryClientProvider>
  );
};

const stocks: Stock[] = [
  {
    id: "kis-005930",
    name: "삼성전자",
    symbol: "005930",
    market: "domestic",
    price: 70000,
    change: 1.12,
    history: [],
  },
  {
    id: "kis-000660",
    name: "SK하이닉스",
    symbol: "000660",
    market: "domestic",
    price: 120000,
    change: -0.45,
    history: [],
  },
];

describe("StockDashboard", () => {
  beforeEach(() => {
    mocks.refetch.mockReset();
    mocks.push.mockReset();
    mocks.useStocks.mockImplementation(() => ({
      data: stocks,
      isLoading: false,
    }));
    mocks.useStockDetail.mockImplementation(() => ({
      data: null,
      isLoading: false,
      isFetching: false,
      isError: false,
      streamingText: "",
      isStreaming: false,
      refetch: mocks.refetch,
    }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          recommendations: [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );
  });

  it("shows domestic ranking selector and updates query ranking", () => {
    renderDashboard("domestic");

    expect(screen.getByText("리스트 기준")).toBeInTheDocument();
    expect(mocks.useStocks).toHaveBeenCalledWith("domestic", "volume");

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "tradeAmount" },
    });

    expect(mocks.useStocks).toHaveBeenLastCalledWith("domestic", "tradeAmount");
  });

  it("hides ranking selector on foreign market", () => {
    mocks.useStocks.mockImplementation(() => ({
      data: stocks.map((stock) => ({ ...stock, market: "foreign" as const })),
      isLoading: false,
    }));

    renderDashboard("foreign");

    expect(screen.queryByText("리스트 기준")).not.toBeInTheDocument();
    expect(mocks.useStocks).toHaveBeenCalledWith("foreign", "volume");
  });

  it("triggers refetch after selecting analyze target", async () => {
    renderDashboard("domestic");

    fireEvent.click(screen.getAllByRole("button", { name: "AI 분석" })[1]);

    await waitFor(() => {
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
    });
  });

  it("navigates to search page when search is submitted", () => {
    renderDashboard("domestic");

    fireEvent.change(
      screen.getByPlaceholderText("종목명 또는 티커로 검색 (예: 삼성전자, AAPL)"),
      { target: { value: "삼성전자" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "검색 실행" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/search?q=%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90"
    );
  });
});
