import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stock } from "@/types/stock";

const mocks = vi.hoisted(() => ({
  useStocks: vi.fn(),
  useStockDetail: vi.fn(),
  refetch: vi.fn(),
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

import StockDashboard from "./StockDashboard";

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
  });

  it("shows domestic ranking selector and updates query ranking", () => {
    render(<StockDashboard market="domestic" />);

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

    render(<StockDashboard market="foreign" />);

    expect(screen.queryByText("리스트 기준")).not.toBeInTheDocument();
    expect(mocks.useStocks).toHaveBeenCalledWith("foreign", "volume");
  });

  it("triggers refetch after selecting analyze target", async () => {
    render(<StockDashboard market="domestic" />);

    fireEvent.click(screen.getAllByRole("button", { name: "AI 분석" })[1]);

    await waitFor(() => {
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
    });
  });
});
