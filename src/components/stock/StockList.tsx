"use client";

import type { Stock } from "@/types/stock";
import StockRow from "./StockRow";

export interface StockListProps {
  stocks: Stock[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (stockId: string) => void;
  onAnalyze: (stockId: string) => void;
  ranking: "volume" | "tradeAmount";
}

const StockRowSkeleton = () => (
  <div className="grid grid-cols-4 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-col gap-2">
      <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-3 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
    </div>
    <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    <div className="ml-auto h-9 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
  </div>
);

export default function StockList({
  stocks,
  isLoading,
  selectedId,
  onSelect,
  onAnalyze,
  ranking,
}: StockListProps) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Stock Overview
          </h2>
          <p className="text-sm text-slate-500">
            최근 7일간의 주식 현황을 모니터링합니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          30초마다 업데이트
        </span>
      </header>

      <ul className="flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 10 }).map((_, index) => (
              <li key={`skeleton-${index}`}>
                <StockRowSkeleton />
              </li>
            ))
          : stocks?.map((stock) => (
              <li key={stock.id}>
                <StockRow
                  stock={stock}
                  isActive={selectedId === stock.id}
                  onSelect={onSelect}
                  onAnalyze={onAnalyze}
                  ranking={ranking}
                />
              </li>
            ))}
      </ul>
    </section>
  );
}
