"use server";

import Groq from "groq-sdk";
import type { StockAIAnalysis, StockPriceSnapshot } from "@/types/stock";
import {
  MODEL_NAME,
  buildUserPrompt,
  fetchNewsContext,
  systemPrompt,
} from "@/services/aiAnalysis";

const parseJsonFromText = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
    }
    return JSON.parse(match[0]);
  }
};

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

export async function getAIStockAnalysis(
  symbol: string,
  priceData: StockPriceSnapshot
): Promise<StockAIAnalysis | null> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const newsContext = await fetchNewsContext(symbol);
  const userPrompt = buildUserPrompt(symbol, priceData, newsContext);

  const completion = await groq.chat.completions.create({
    model: MODEL_NAME,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI 응답이 비어 있습니다.");
  }

  const parsed = parseJsonFromText(content);

  return {
    stockId: symbol,
    sentiment: toSentiment(String(parsed.sentiment ?? "")),
    summary: ensureString(parsed.summary, "요약 정보를 생성하지 못했습니다."),
    factorsUp: sanitizeArray(parsed.factorsUp),
    factorsDown: sanitizeArray(parsed.factorsDown),
    momentum: ensureString(parsed.momentum, "모멘텀 정보가 없습니다."),
    risks: sanitizeArray(parsed.risks),
    newsSummary: sanitizeArray(parsed.newsSummary),
  };
}
