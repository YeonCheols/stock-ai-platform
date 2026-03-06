import { searchStocksFromKis } from "@/services/kisApi";

const normalize = (value: string) => value.trim().toLowerCase();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? searchParams.get("q") ?? "";
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return Response.json(
      { error: "검색어를 입력해주세요." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const results = await searchStocksFromKis(normalizedQuery);

    return Response.json(results, {
      headers: {
        "Cache-Control": "no-store",
        "X-Stock-Source": "kis",
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    return Response.json(
      { source: "kis", error: message },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Stock-Source": "error",
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
}
