"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, createChart } from "lightweight-charts";
import type { StockHistoryPoint } from "@/types/stock";

interface StockChartProps {
  history: StockHistoryPoint[];
  market: "domestic" | "foreign";
  height?: number;
}

const getPriceFormatter = (market: "domestic" | "foreign") => {
  const locale =
    typeof window !== "undefined"
      ? window.navigator.languages?.[0] ?? window.navigator.language ?? "en-US"
      : "en-US";

  if (market === "domestic") {
    return Intl.NumberFormat(locale, {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format;
  }

  return Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format;
};

export default function StockChart({
  history,
  market,
  height = 160,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { color: "#222" },
        textColor: "#C3BCDB",
      },
      grid: {
        vertLines: { color: "#444" },
        horzLines: { color: "#444" },
      },
      rightPriceScale: {
        visible: true,
        borderColor: "#71649C",
      },
      leftPriceScale: { visible: false },
      timeScale: {
        visible: true,
        borderColor: "#71649C",
      },
    });

    chart.applyOptions({
      localization: {
        priceFormatter: getPriceFormatter(market),
      },
    });

    // KR market convention: up = red, down = blue.
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "rgb(225, 50, 85)",
      downColor: "rgb(54, 116, 217)",
      borderVisible: false,
      wickUpColor: "rgb(225, 50, 85)",
      wickDownColor: "rgb(54, 116, 217)",
    });

    const candleData = history.map((point, index) => {
      const prev = history[index - 1]?.value ?? point.value;
      const open = prev;
      const close = point.value;
      const baseHigh = Math.max(open, close);
      const baseLow = Math.min(open, close);
      const spread = Math.max(1, baseHigh * 0.005);
      return {
        time: point.date,
        open,
        high: baseHigh + spread,
        low: Math.max(0, baseLow - spread),
        close,
      };
    });

    candleSeries.setData(candleData);
    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      chart.applyOptions({ width: Math.floor(entry.contentRect.width) });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [history, market, height]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
