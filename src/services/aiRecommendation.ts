import "server-only";

import Groq from "groq-sdk";
import { fetchNewsContext, MODEL_NAME } from "@/services/aiAnalysis";
import type { Stock, StockRecommendation } from "@/types/stock";

const MAX_CANDIDATES = 8;

const toNumber = (value: unknown, fallback: number) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num;
    }
  }
  return fallback;
};

const sanitizeArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const ensureString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value : fallback;

const parseJsonFromText = (content: string) => {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 추천 응답에서 JSON을 찾을 수 없습니다.");
    }
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
};

const getMomentum = (stock: Stock) => {
  const first = stock.history[0]?.value ?? 0;
  const last = stock.history[stock.history.length - 1]?.value ?? 0;
  if (first <= 0 || last <= 0) {
    return 0;
  }
  return ((last - first) / first) * 100;
};

const getQuantScore = (stock: Stock) => {
  const momentum = getMomentum(stock);
  const change = stock.change;
  return momentum * 0.55 + change * 0.45;
};

const buildRecommendationPrompt = (
  market: "domestic" | "foreign",
  riskProfile: "conservative" | "balanced" | "aggressive",
  horizon: "short" | "swing" | "mid",
  candidates: Array<{
    stock: Stock;
    quantScore: number;
    momentum: number;
    newsContext: string[];
  }>
) => {
  const candidateRows = candidates.map((item) => ({
    id: item.stock.id,
    symbol: item.stock.symbol,
    name: item.stock.name,
    market: item.stock.market,
    price: item.stock.price,
    change: item.stock.change,
    momentum: Number(item.momentum.toFixed(2)),
    quantScore: Number(item.quantScore.toFixed(2)),
    newsContext: item.newsContext,
  }));

  return [
    "당신은 한국어로 답하는 주식 추천 AI입니다.",
    "모든 설명 텍스트(thesis, catalysts, risks, newsSummary)는 반드시 한국어로 작성하세요.",
    "영어 문장으로 답변하지 마세요.",
    "반드시 입력된 후보 종목 내에서만 추천하세요.",
    `targetMarket: ${market}`,
    `riskProfile: ${riskProfile}`,
    `horizon: ${horizon}`,
    "아래 후보를 기반으로 top 3를 추천하고 근거를 제시하세요.",
    "JSON 형식으로만 답변하세요.",
    JSON.stringify(
      {
        recommendations: [
          {
            symbol: "AAPL",
            action: "buy | hold | avoid",
            score: 0,
            confidence: 0,
            thesis: "핵심 투자 아이디어",
            catalysts: ["상승 촉매"],
            risks: ["리스크"],
            newsSummary: ["뉴스 요약"],
          },
        ],
      },
      null,
      2
    ),
    `candidates: ${JSON.stringify(candidateRows)}`,
  ].join("\n");
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const fallbackRecommendations = (
  candidates: Array<{ stock: Stock; quantScore: number }>
): StockRecommendation[] =>
  candidates.slice(0, 3).map((item) => ({
    stockId: item.stock.id,
    symbol: item.stock.symbol,
    name: item.stock.name,
    market: item.stock.market,
    action: "hold",
    score: Number(clamp(item.quantScore + 50, 0, 100).toFixed(1)),
    confidence: 0.45,
    thesis: "정량 모멘텀 기준으로 상위 후보로 분류되었습니다.",
    catalysts: ["가격 모멘텀이 상대적으로 우위입니다."],
    risks: ["시장 변동성 확대 시 신호가 약화될 수 있습니다."],
    newsSummary: ["뉴스 데이터가 제한적이어서 보수적으로 해석하세요."],
  }));

export const getAIRecommendations = async (params: {
  market: "domestic" | "foreign";
  stocks: Stock[];
  count?: number;
  riskProfile?: "conservative" | "balanced" | "aggressive";
  horizon?: "short" | "swing" | "mid";
}) => {
  const {
    market,
    stocks,
    count = 3,
    riskProfile = "balanced",
    horizon = "swing",
  } = params;

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const targetStocks = stocks
    .filter((stock) => stock.market === market)
    .map((stock) => ({
      stock,
      momentum: getMomentum(stock),
      quantScore: getQuantScore(stock),
    }))
    .sort((a, b) => b.quantScore - a.quantScore)
    .slice(0, MAX_CANDIDATES);

  if (targetStocks.length === 0) {
    return [] as StockRecommendation[];
  }

  const newsContexts = await Promise.all(
    targetStocks.map((item) =>
      fetchNewsContext(item.stock.symbol).catch(() => [
        "뉴스를 불러오지 못해 기본 컨텍스트를 사용합니다.",
      ])
    )
  );

  const prompt = buildRecommendationPrompt(
    market,
    riskProfile,
    horizon,
    targetStocks.map((item, index) => ({
      ...item,
      newsContext: newsContexts[index] ?? [],
    }))
  );

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "당신은 한국어 투자 리서치 어시스턴트입니다. 투자 조언이 아닌 참고 정보임을 전제로, 신중하고 근거 중심으로 추천을 생성하세요. 설명 문장은 반드시 한국어로 작성하세요.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return fallbackRecommendations(targetStocks).slice(0, count);
  }

  try {
    const parsed = parseJsonFromText(content);
    const rows = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [];

    const bySymbol = new Map(
      targetStocks.map((item) => [item.stock.symbol.toUpperCase(), item.stock])
    );

    const mapped = rows
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const safe = row as Record<string, unknown>;
        const symbol = ensureString(safe.symbol, "").toUpperCase();
        const stock = bySymbol.get(symbol);
        if (!stock) {
          return null;
        }
        const actionRaw = ensureString(safe.action, "hold").toLowerCase();
        const action: StockRecommendation["action"] =
          actionRaw === "buy" || actionRaw === "avoid" ? actionRaw : "hold";

        return {
          stockId: stock.id,
          symbol: stock.symbol,
          name: stock.name,
          market: stock.market,
          action,
          score: Number(clamp(toNumber(safe.score, 55), 0, 100).toFixed(1)),
          confidence: Number(
            clamp(toNumber(safe.confidence, 0.5), 0, 1).toFixed(2)
          ),
          thesis: ensureString(
            safe.thesis,
            "수급/모멘텀/뉴스를 종합한 관점에서 관찰이 필요한 종목입니다."
          ),
          catalysts: sanitizeArray(safe.catalysts),
          risks: sanitizeArray(safe.risks),
          newsSummary: sanitizeArray(safe.newsSummary),
        } satisfies StockRecommendation;
      })
      .filter((item): item is StockRecommendation => Boolean(item));

    if (mapped.length === 0) {
      return fallbackRecommendations(targetStocks).slice(0, count);
    }

    return mapped.slice(0, count);
  } catch {
    return fallbackRecommendations(targetStocks).slice(0, count);
  }
};
