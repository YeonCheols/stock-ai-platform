"use client";

import Link from "next/link";
import type { Stock } from "@/types/stock";
import { cn } from "@/lib/cn";

interface StockRowProps {
  stock: Stock;
  isActive: boolean;
  onSelect: (stockId: string) => void;
  onAnalyze: (stockId: string) => void;
  ranking: "volume" | "tradeAmount";
}

export default function StockRow({
  stock,
  isActive,
  onSelect,
  onAnalyze,
  ranking,
}: StockRowProps) {
  const isPositive = stock.change > 0;
  const formattedPrice =
    stock.market === "domestic"
      ? `${stock.price.toLocaleString()}원`
      : stock.price.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });

  return (
    <div
      className={cn(
        "group grid cursor-pointer grid-cols-4 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        isActive && "ring-2 ring-slate-900/20 dark:ring-slate-100/30"
      )}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(stock.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(stock.id);
        }
      }}
    >
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 dark:text-white">
          {stock.name}
        </span>
        <span className="text-xs text-slate-500">{stock.symbol}</span>
      </div>
      <div className="text-right font-mono font-medium">{formattedPrice}</div>
      <div
        className={cn(
          "text-right font-semibold",
          isPositive ? "text-rose-500" : "text-blue-500"
        )}
      >
        {isPositive ? "+" : ""}
        {stock.change.toFixed(2)}%
      </div>
      <div className="flex flex-col items-end gap-2">
        <button
          className="cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAnalyze(stock.id);
          }}
        >
          AI 분석
        </button>
        <Link
          className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          href={`/stock/${stock.id}?market=${stock.market}&ranking=${ranking}`}
          onClick={(event) => event.stopPropagation()}
        >
          차트 보기
        </Link>
      </div>
    </div>
  );
}
