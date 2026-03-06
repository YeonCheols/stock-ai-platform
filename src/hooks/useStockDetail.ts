import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Stock, StockAIAnalysis } from "@/types/stock";

const toSentiment = (value: string): StockAIAnalysis["sentiment"] => {
  const normalized = value.toLowerCase();
  if (normalized.includes("bull")) {
    return "positive";
  }
  if (normalized.includes("bear")) {
    return "negative";
  }
  return "neutral";
};

const sanitizeArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];

const ensureString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const parseAnalysis = (
  symbol: string,
  payload: Record<string, unknown>
): StockAIAnalysis => ({
  stockId: symbol,
  sentiment: toSentiment(String(payload.sentiment ?? "")),
  summary: ensureString(payload.summary, "요약 정보를 생성하지 못했습니다."),
  factorsUp: sanitizeArray(payload.factorsUp),
  factorsDown: sanitizeArray(payload.factorsDown),
  momentum: ensureString(payload.momentum, "모멘텀 정보가 없습니다."),
  risks: sanitizeArray(payload.risks),
  newsSummary: sanitizeArray(payload.newsSummary),
});

const fetchStreamedAnalysis = async (
  stock: Stock,
  handlers?: {
    onStart?: () => void;
    onDelta?: (text: string) => void;
    onDone?: () => void;
  }
) => {
  handlers?.onStart?.();
  const response = await fetch("/api/stock-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: stock.symbol,
      priceData: {
        currentPrice: stock.price,
        change: stock.change,
        history: stock.history,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("AI 분석 요청 실패");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("스트리밍 응답을 열 수 없습니다.");
  }

  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
    handlers?.onDelta?.(result);
  }
  result += decoder.decode();
  handlers?.onDone?.();

  const parsed = JSON.parse(result) as Record<string, unknown>;
  return parseAnalysis(stock.symbol, parsed);
};

export const useStockDetail = (stock: Stock | null) => {
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const query = useQuery({
    queryKey: [
      "stock-detail",
      stock?.id,
      stock?.price,
      stock?.change,
      stock?.history.map((point) => point.value).join(","),
    ],
    queryFn: () =>
      stock
        ? fetchStreamedAnalysis(stock, {
            onStart: () => {
              setStreamingText("");
              setIsStreaming(true);
            },
            onDelta: (text) => setStreamingText(text),
            onDone: () => setIsStreaming(false),
          })
        : null,
    enabled: Boolean(stock),
  });

  return { ...query, streamingText, isStreaming };
};
