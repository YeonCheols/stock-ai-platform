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
