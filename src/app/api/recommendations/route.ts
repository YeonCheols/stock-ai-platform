import { getAIRecommendations } from "@/services/aiRecommendation";
import type { Stock } from "@/types/stock";

const isMarket = (value: string): value is "domestic" | "foreign" =>
  value === "domestic" || value === "foreign";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      market?: string;
      count?: number;
      riskProfile?: "conservative" | "balanced" | "aggressive";
      horizon?: "short" | "swing" | "mid";
      stocks?: unknown;
    };

    const marketParam = body.market ?? "";
    if (!isMarket(marketParam)) {
      return Response.json(
        { error: "market 파라미터가 필요합니다." },
        { status: 400 }
      );
    }
    const safeMarket: "domestic" | "foreign" = marketParam;

    const stocks = Array.isArray(body.stocks) ? (body.stocks as Stock[]) : [];
    if (stocks.length === 0) {
      return Response.json(
        { error: "stocks 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const recommendations = await getAIRecommendations({
      market: safeMarket,
      stocks,
      count: typeof body.count === "number" ? body.count : 3,
      riskProfile: body.riskProfile,
      horizon: body.horizon,
    });

    return Response.json(
      {
        market: safeMarket,
        count: recommendations.length,
        generatedAt: new Date().toISOString(),
        recommendations,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
