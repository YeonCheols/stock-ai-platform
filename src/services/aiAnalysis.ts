import "server-only";

import type { StockHistoryPoint, StockPriceSnapshot } from "@/types/stock";

export const MODEL_NAME = "llama-3.3-70b-versatile";

export const systemPrompt = [
  "당신은 월스트리트 금융 분석 전문가입니다.",
  "제공된 뉴스 컨텍스트와 수치를 바탕으로 상승 요인(Pros)과 리스크(Cons)를 날카롭게 분석하세요.",
  "한국어로 응답하며, 전문적이고 신뢰감 있는 톤을 유지하세요.",
].join(" ");

const summarizeHistory = (history: StockHistoryPoint[]) =>
  history.map((point) => `${point.date}:${point.value}`).join(", ");

export const buildUserPrompt = (
  symbol: string,
  priceData: StockPriceSnapshot,
  newsContext: string[]
) =>
  [
    `symbol: ${symbol}`,
    `currentPrice: ${priceData.currentPrice}`,
    `changePercent: ${priceData.change}`,
    `history: ${summarizeHistory(priceData.history)}`,
    `newsContext: ${newsContext.join(" | ")}`,
    "다음 JSON 형식으로만 응답하세요:",
    JSON.stringify(
      {
        sentiment: "Bullish | Bearish | Neutral",
        summary: "핵심 요약",
        factorsUp: ["상승 요인"],
        factorsDown: ["하락 요인"],
        risks: ["주요 리스크"],
        momentum: "모멘텀 요약",
        newsSummary: ["뉴스 기반 인사이트 요약"],
      },
      null,
      2
    ),
  ].join("\n");

const parseNewsTitles = (data: Record<string, unknown>) => {
  const items = Array.isArray(data.news) ? data.news : [];
  const titles = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const title = (item as { title?: unknown }).title;
      return typeof title === "string" ? title.trim() : null;
    })
    .filter((title): title is string => Boolean(title));
  return titles.slice(0, 4);
};

const fetchNewsFromSerpApi = async (symbol: string) => {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return null;
  }
  const url = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(
    `${symbol} stock`
  )}&api_key=${apiKey}`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Record<string, unknown>;
  const results = Array.isArray(data.news_results) ? data.news_results : [];
  const titles = results
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const title = (item as { title?: unknown }).title;
      return typeof title === "string" ? title.trim() : null;
    })
    .filter((title): title is string => Boolean(title));
  return titles.slice(0, 4);
};

const fetchNewsFromBing = async (symbol: string) => {
  const apiKey = process.env.BING_NEWS_KEY;
  if (!apiKey) {
    return null;
  }
  const url = `https://api.bing.microsoft.com/v7.0/news/search?q=${encodeURIComponent(
    `${symbol} stock`
  )}&count=4&textFormat=Raw&safeSearch=Off`;
  const response = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": apiKey },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as Record<string, unknown>;
  const items = Array.isArray(data.value) ? data.value : [];
  const titles = items
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const title = (item as { name?: unknown }).name;
      return typeof title === "string" ? title.trim() : null;
    })
    .filter((title): title is string => Boolean(title));
  return titles.slice(0, 4);
};

const fetchNewsFromYahoo = async (symbol: string) => {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    symbol
  )}&newsCount=4&listsCount=0`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as Record<string, unknown>;
  return parseNewsTitles(data);
};

export const fetchNewsContext = async (symbol: string) => {
  try {
    const serpTitles = await fetchNewsFromSerpApi(symbol);
    if (serpTitles && serpTitles.length > 0) {
      return serpTitles;
    }
  } catch {
    // ignore
  }

  try {
    const bingTitles = await fetchNewsFromBing(symbol);
    if (bingTitles && bingTitles.length > 0) {
      return bingTitles;
    }
  } catch {
    // ignore
  }

  try {
    const yahooTitles = await fetchNewsFromYahoo(symbol);
    if (yahooTitles.length > 0) {
      return yahooTitles;
    }
  } catch {
    // ignore
  }

  return [
    "시장 전반 변동성 확대",
    "수급 변화에 따른 단기 가격 등락",
    "리스크 관리 필요성 부각",
  ];
};
