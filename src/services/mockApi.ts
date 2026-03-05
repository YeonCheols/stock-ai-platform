import type { Stock } from "@/types/stock";

export const fetchStocks = async (
  market: "domestic" | "foreign",
  ranking: "volume" | "tradeAmount"
) => {
  const response = await fetch(
    `/api/stocks?market=${market}&ranking=${ranking}`
  );
  if (!response.ok) {
    throw new Error("실시간 주식 데이터를 불러오지 못했습니다.");
  }
  return (await response.json()) as Stock[];
};
