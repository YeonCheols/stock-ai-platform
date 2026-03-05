"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import StockList from "@/components/stock/StockList";
import AIAnalysisPanel from "@/components/stock/AIAnalysisPanel";
import { useStocks } from "@/hooks/useStocks";
import { useStockDetail } from "@/hooks/useStockDetail";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Market = "domestic" | "foreign";

interface StockDashboardProps {
  market: Market;
}

const tabs = [
  { label: "국내 주식", href: "/domestic", value: "domestic" as Market },
  { label: "해외 주식", href: "/foreign", value: "foreign" as Market },
];

export default function StockDashboard({ market }: StockDashboardProps) {
  const [domesticRanking, setDomesticRanking] = useState<
    "volume" | "tradeAmount"
  >("volume");
  const effectiveRanking = market === "domestic" ? domesticRanking : "volume";
  const { data: stocks, isLoading } = useStocks(market, effectiveRanking);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredStocks = useMemo(() => {
    const list = stocks?.filter((stock) => stock.market === market) ?? [];
    return list.slice(0, 20);
  }, [stocks, market]);

  const effectiveSelectedId =
    filteredStocks.find((stock) => stock.id === selectedId)?.id ??
    filteredStocks[0]?.id ??
    null;

  const selectedStock = useMemo(
    () =>
      filteredStocks.find((stock) => stock.id === effectiveSelectedId) ?? null,
    [filteredStocks, effectiveSelectedId]
  );

  const {
    data: analysis,
    isLoading: analysisLoading,
    isFetching: analysisFetching,
    isError: analysisError,
    streamingText,
    isStreaming,
    refetch,
  } = useStockDetail(selectedStock);
  const pendingAnalyzeRef = useRef<string | null>(null);
  const [dismissedToastKey, setDismissedToastKey] = useState<string | null>(
    null
  );
  const toastKey =
    analysisError && selectedStock
      ? `${selectedStock.id}-${selectedStock.price}-${selectedStock.change}`
      : null;
  const isToastOpen = Boolean(toastKey && toastKey !== dismissedToastKey);

  useEffect(() => {
    if (!pendingAnalyzeRef.current || !selectedStock) {
      return;
    }
    if (selectedStock.id === pendingAnalyzeRef.current) {
      pendingAnalyzeRef.current = null;
      refetch();
    }
  }, [selectedStock, refetch]);

  const handleAnalyze = (stockId: string) => {
    setSelectedId(stockId);
    pendingAnalyzeRef.current = stockId;
  };

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Stock AI Dashboard
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                주식 현황 및 AI 분석 대시보드
              </h1>
              <p className="max-w-2xl text-sm text-slate-500">
                실시간 시뮬레이션 데이터를 기반으로 종목별 모멘텀과 리스크를
                분석합니다.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.href}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold transition",
                  tab.value === market
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="flex flex-col gap-4">
          {market === "domestic" && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                리스트 기준
              </span>
              <select
                value={domesticRanking}
                onChange={(event) =>
                  setDomesticRanking(
                    event.target.value as "volume" | "tradeAmount"
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="volume">거래량 TOP 20</option>
                <option value="tradeAmount">인기 TOP 20 (거래대금)</option>
              </select>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <StockList
            stocks={filteredStocks}
            isLoading={isLoading}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
            onAnalyze={handleAnalyze}
            ranking={effectiveRanking}
          />
          <AIAnalysisPanel
            stock={selectedStock}
            analysis={analysis}
            isLoading={analysisLoading || analysisFetching}
            hasError={analysisError}
            streamingText={streamingText}
            isStreaming={isStreaming}
          />
          </div>
        </div>
      </section>
      <Toast
        message="현재 AI 분석 기능을 사용할 수 없습니다."
        isOpen={isToastOpen}
        onClose={() => setDismissedToastKey(toastKey)}
        tone="error"
      />
    </main>
  );
}
