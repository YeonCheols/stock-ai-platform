"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import StockList from "@/components/stock/StockList";
import AIAnalysisPanel from "@/components/stock/AIAnalysisPanel";
import ThemeToggle from "@/components/ThemeToggle";
import Toast from "@/components/ui/Toast";
import { useStockDetail } from "@/hooks/useStockDetail";
import type { Stock } from "@/types/stock";

function StockSearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (
    searchParams.get("q") ??
    searchParams.get("query") ??
    ""
  ).trim();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pendingAnalyzeRef = useRef<string | null>(null);
  const [dismissedToastKey, setDismissedToastKey] = useState<string | null>(
    null
  );

  const {
    data: results = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-search", query],
    queryFn: async () => {
      const response = await fetch(
        `/api/stocks/search?q=${encodeURIComponent(query)}`
      );
      if (!response.ok) {
        throw new Error("검색 결과를 불러오지 못했습니다.");
      }
      return (await response.json()) as Stock[];
    },
    enabled: Boolean(query),
    retry: false,
  });

  const effectiveSelectedId =
    results.find((stock) => stock.id === selectedId)?.id ??
    results[0]?.id ??
    null;
  const selectedStock = useMemo(
    () => results.find((stock) => stock.id === effectiveSelectedId) ?? null,
    [results, effectiveSelectedId]
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("query") ?? "").trim();
    if (!nextQuery) {
      return;
    }
    router.push(`/search?q=${encodeURIComponent(nextQuery)}`);
    setSelectedId(null);
  };

  const toastKey =
    analysisError && selectedStock
      ? `${selectedStock.id}-${selectedStock.price}-${selectedStock.change}`
      : null;
  const isToastOpen = Boolean(toastKey && toastKey !== dismissedToastKey);
  const backHref = "/domestic";

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                  Stock Search
                </p>
                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                  종목 검색 결과
                </h1>
                <p className="text-sm text-slate-500">
                  국내/해외 통합 검색 결과
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={backHref}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  목록으로
                </Link>
                <ThemeToggle />
              </div>
            </div>
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <input
                key={query}
                name="query"
                defaultValue={query}
                placeholder="종목명 또는 티커로 검색"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="submit"
                aria-label="검색 실행"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              검색 중...
            </p>
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <StockList
              stocks={results}
              isLoading={false}
              selectedId={effectiveSelectedId}
              onSelect={setSelectedId}
              onAnalyze={handleAnalyze}
              ranking="volume"
            />
            <AIAnalysisPanel
              stock={selectedStock}
              analysis={analysis}
              isLoading={analysisLoading || analysisFetching}
              hasError={analysisError || isError}
              streamingText={streamingText}
              isStreaming={isStreaming}
            />
          </div>
        )}
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

export default function StockSearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-6 py-10 lg:px-12">
          <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                검색 화면 로딩 중...
              </p>
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          </section>
        </main>
      }
    >
      <StockSearchPageContent />
    </Suspense>
  );
}
