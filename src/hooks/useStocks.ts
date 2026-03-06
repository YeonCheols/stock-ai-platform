import { useQuery } from "@tanstack/react-query";
import { fetchStocks } from "@/services/mockApi";

export const useStocks = (
  market: "domestic" | "foreign",
  ranking: "volume" | "tradeAmount"
) =>
  useQuery({
    queryKey: ["stocks", market, ranking],
    queryFn: () => fetchStocks(market, ranking),
    refetchInterval: 300000,
    refetchOnWindowFocus: false,
    retry: false,
  });
