export type StockSentiment = "positive" | "neutral" | "negative";

export interface StockHistoryPoint {
  date: string;
  value: number;
}

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  market: "domestic" | "foreign";
  price: number;
  change: number;
  history: StockHistoryPoint[];
}

export interface StockPriceSnapshot {
  currentPrice: number;
  change: number;
  history: StockHistoryPoint[];
}

export interface StockAIAnalysis {
  stockId: string;
  sentiment: StockSentiment;
  summary: string;
  factorsUp: string[];
  factorsDown: string[];
  momentum: string;
  risks: string[];
  newsSummary: string[];
}

export interface StockRecommendation {
  stockId: string;
  symbol: string;
  name: string;
  market: "domestic" | "foreign";
  action: "buy" | "hold" | "avoid";
  score: number;
  confidence: number;
  thesis: string;
  catalysts: string[];
  risks: string[];
  newsSummary: string[];
}
