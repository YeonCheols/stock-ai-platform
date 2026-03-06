"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import StockChart from "@/components/stock/StockChart";
import type { Stock } from "@/types/stock";
import { cn } from "@/lib/cn";

const formatPrice = (price: number, market: "domestic" | "foreign") =>
  market === "domestic"
    ? `${price.toLocaleString()}원`
    : price.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });

export default function StockDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const marketParam = searchParams.get("market");
  const market = marketParam === "foreign" ? "foreign" : "domestic";
  const stockId = Array.isArray(params.id) ? params.id[0] : params.id;

  const {
    data: stock,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["stock-item", stockId],
    queryFn: async () => {
      const response = await fetch(`/api/stocks/item?id=${encodeURIComponent(stockId ?? "")}`);
      if (!response.ok) {
        throw new Error("종목 조회에 실패했습니다.");
      }
      return (await response.json()) as Stock;
    },
    enabled: Boolean(stockId),
    retry: false,
  });

  const backHref = (stock?.market ?? market) === "foreign" ? "/foreign" : "/domestic";
  const isPositive = (stock?.change ?? 0) > 0;

  return (
    <main className="min-h-screen px-6 py-10 lg:px-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Stock Chart
            </p>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              차트 상세
            </h1>
          </div>
          <Link
            href={backHref}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          >
            목록으로 돌아가기
          </Link>
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-6 h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : stock ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {stock.name}
                </h2>
                <p className="text-sm text-slate-500">{stock.symbol}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">
                  {formatPrice(stock.price, stock.market)}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isPositive ? "text-rose-500" : "text-blue-500"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {stock.change.toFixed(2)}%
                </p>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl border border-[#444] bg-[#222]">
              <StockChart
                history={stock.history}
                market={stock.market}
                height={420}
              />
            </div>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
            종목 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            현재 리스트에서 종목을 찾을 수 없습니다.
          </div>
        )}
      </section>
    </main>
  );
}
