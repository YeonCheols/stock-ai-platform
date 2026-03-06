import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Stock } from "@/types/stock";
import StockRow from "./StockRow";

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

const stock: Stock = {
  id: "kis-005930",
  name: "삼성전자",
  symbol: "005930",
  market: "domestic",
  price: 70000,
  change: 1.23,
  history: [
    { date: "2026-03-01", value: 69500 },
    { date: "2026-03-02", value: 70000 },
  ],
};

describe("StockRow", () => {
  it("calls onSelect when row is clicked", () => {
    const onSelect = vi.fn();
    const onAnalyze = vi.fn();
    render(
      <StockRow
        stock={stock}
        isActive={false}
        onSelect={onSelect}
        onAnalyze={onAnalyze}
        ranking="volume"
      />
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onSelect).toHaveBeenCalledWith("kis-005930");
  });

  it("calls onAnalyze without bubbling select", () => {
    const onSelect = vi.fn();
    const onAnalyze = vi.fn();
    render(
      <StockRow
        stock={stock}
        isActive={false}
        onSelect={onSelect}
        onAnalyze={onAnalyze}
        ranking="tradeAmount"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "AI 분석" }));
    expect(onAnalyze).toHaveBeenCalledWith("kis-005930");
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "차트 보기" })).toHaveAttribute(
      "href",
      "/stock/kis-005930?market=domestic&ranking=tradeAmount"
    );
  });

  it("supports keyboard selection with Enter and Space", () => {
    const onSelect = vi.fn();
    const onAnalyze = vi.fn();
    render(
      <StockRow
        stock={stock}
        isActive={false}
        onSelect={onSelect}
        onAnalyze={onAnalyze}
        ranking="volume"
      />
    );

    const row = screen.getAllByRole("button")[0];
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });

    expect(onSelect).toHaveBeenNthCalledWith(1, "kis-005930");
    expect(onSelect).toHaveBeenNthCalledWith(2, "kis-005930");
  });
});
