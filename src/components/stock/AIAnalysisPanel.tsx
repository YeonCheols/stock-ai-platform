"use client";

import type { Stock, StockAIAnalysis } from "@/types/stock";
import { cn } from "@/lib/cn";
import AIAnalysisSkeleton from "@/components/stock/AIAnalysisSkeleton";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";

interface AIAnalysisPanelProps {
  stock: Stock | null;
  analysis: StockAIAnalysis | null | undefined;
  isLoading: boolean;
  hasError: boolean;
  streamingText?: string;
  isStreaming?: boolean;
}

const sentimentLabel = (sentiment: StockAIAnalysis["sentiment"]) => {
  switch (sentiment) {
    case "positive":
      return "Bullish";
    case "negative":
      return "Bearish";
    default:
      return "Neutral";
  }
};

const sentimentClass = (sentiment: StockAIAnalysis["sentiment"]) =>
  cn(
    "rounded-full px-3 py-1 text-xs font-semibold",
    sentiment === "positive" && "bg-rose-100 text-rose-500",
    sentiment === "negative" && "bg-blue-100 text-blue-500",
    sentiment === "neutral" && "bg-slate-100 text-slate-600",
    "dark:bg-slate-800 dark:text-slate-200"
  );

export default function AIAnalysisPanel({
  stock,
  analysis,
  isLoading,
  hasError,
  streamingText,
  isStreaming,
}: AIAnalysisPanelProps) {
  return (
    <aside className="rounded-2xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            AI Insights
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {stock ? `${stock.name} (${stock.symbol})` : "종목을 선택하세요"}
          </h2>
        </div>
        <div className="rounded-full bg-slate-900 p-2 text-white dark:bg-slate-100 dark:text-slate-900">
          <Sparkles className="h-4 w-4" />
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Thinking...
          </span>
          <AIAnalysisSkeleton />
          {streamingText ? (
            <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 text-xs text-slate-500 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
              <div className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-slate-400">
                Live Stream
                {isStreaming ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                ) : null}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">
                {streamingText}
              </p>
            </div>
          ) : null}
        </div>
      ) : hasError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
          현재 AI 분석 기능을 사용할 수 없습니다.
        </div>
      ) : analysis ? (
        <div className="animate-fade-in space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className={sentimentClass(analysis.sentiment)}>
              투자 감성: {sentimentLabel(analysis.sentiment)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {analysis.momentum}
            </span>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              AI 요약
            </h3>
            <p className="mt-2 leading-relaxed">{analysis.summary}</p>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                상승 요인
              </h4>
              <ul className="mt-2 space-y-2">
                {analysis.factorsUp.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                하락 요인
              </h4>
              <ul className="mt-2 space-y-2">
                {analysis.factorsDown.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              주요 리스크
            </h4>
            <ul className="mt-2 space-y-2">
              {analysis.risks.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              실시간 뉴스 요약
            </h4>
            <ul className="mt-2 space-y-2">
              {analysis.newsSummary.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          종목을 선택하면 AI 분석 결과가 표시됩니다.
        </p>
      )}
    </aside>
  );
}
