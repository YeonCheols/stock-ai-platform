import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Stock, StockAIAnalysis } from "@/types/stock";
import AIAnalysisPanel from "./AIAnalysisPanel";

const stock: Stock = {
  id: "kis-005930",
  name: "삼성전자",
  symbol: "005930",
  market: "domestic",
  price: 70000,
  change: 1.23,
  history: [],
};

const analysis: StockAIAnalysis = {
  stockId: "kis-005930",
  sentiment: "positive",
  summary: "상승 추세가 유지되고 있습니다.",
  factorsUp: ["외국인 순매수"],
  factorsDown: ["반도체 업황 둔화 우려"],
  momentum: "단기 상승",
  risks: ["변동성 확대"],
  newsSummary: ["신제품 기대감 반영"],
};

describe("AIAnalysisPanel", () => {
  it("shows placeholder when no stock selected", () => {
    render(
      <AIAnalysisPanel
        stock={null}
        analysis={null}
        isLoading={false}
        hasError={false}
      />
    );

    expect(screen.getByText("종목을 선택하세요")).toBeInTheDocument();
    expect(
      screen.getByText("종목을 선택하면 AI 분석 결과가 표시됩니다.")
    ).toBeInTheDocument();
  });

  it("shows loading state with streaming text", () => {
    render(
      <AIAnalysisPanel
        stock={stock}
        analysis={null}
        isLoading
        hasError={false}
        streamingText="streaming..."
        isStreaming
      />
    );

    expect(screen.getByText("Thinking...")).toBeInTheDocument();
    expect(screen.getByText("Live Stream")).toBeInTheDocument();
    expect(screen.getByText("streaming...")).toBeInTheDocument();
  });

  it("renders analysis content", () => {
    render(
      <AIAnalysisPanel
        stock={stock}
        analysis={analysis}
        isLoading={false}
        hasError={false}
      />
    );

    const sentimentBadge = screen.getByText("투자 감성: Bullish");
    expect(sentimentBadge).toBeInTheDocument();
    expect(sentimentBadge).toHaveClass("bg-rose-100");
    expect(screen.getByText("AI 요약")).toBeInTheDocument();
    expect(screen.getByText("상승 추세가 유지되고 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("단기 상승")).toBeInTheDocument();
    expect(screen.getByText("주요 리스크")).toBeInTheDocument();
    expect(screen.getByText("실시간 뉴스 요약")).toBeInTheDocument();
    expect(screen.getByText("외국인 순매수")).toBeInTheDocument();
  });
});
