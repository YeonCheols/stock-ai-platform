import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Stock } from "@/types/stock";
import StockList from "./StockList";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const stocks: Stock[] = [
  {
    id: "kis-005930",
    name: "삼성전자",
    symbol: "005930",
    market: "domestic",
    price: 70000,
    change: 1.23,
    history: [],
  },
  {
    id: "kis-000660",
    name: "SK하이닉스",
    symbol: "000660",
    market: "domestic",
    price: 120000,
    change: -0.54,
    history: [],
  },
];

describe("StockList", () => {
  it("renders loading skeletons when loading", () => {
    render(
      <StockList
        stocks={undefined}
        isLoading
        selectedId={null}
        onSelect={vi.fn()}
        onAnalyze={vi.fn()}
        ranking="volume"
      />
    );

    expect(screen.queryByText("삼성전자")).not.toBeInTheDocument();
    expect(screen.getByText("Stock Overview")).toBeInTheDocument();
  });

  it("renders rows and triggers callbacks", () => {
    const onSelect = vi.fn();
    const onAnalyze = vi.fn();

    render(
      <StockList
        stocks={stocks}
        isLoading={false}
        selectedId="kis-005930"
        onSelect={onSelect}
        onAnalyze={onAnalyze}
        ranking="tradeAmount"
      />
    );

    expect(screen.getByText("삼성전자")).toBeInTheDocument();
    expect(screen.getByText("SK하이닉스")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "AI 분석" })[0]);
    expect(onAnalyze).toHaveBeenCalledWith("kis-005930");
  });
});
