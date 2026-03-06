import { fetchStockByIdFromKis } from "@/services/kisApi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  if (!id.trim()) {
    return Response.json(
      { error: "id 파라미터가 필요합니다." },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const stock = await fetchStockByIdFromKis(id);
    return Response.json(stock, {
      headers: {
        "Cache-Control": "no-store",
        "X-Stock-Source": "kis",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("찾을 수 없습니다") ? 404 : 503;
    return Response.json(
      {
        source: "kis",
        error: message,
      },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
          "X-Stock-Source": "error",
        },
      }
    );
  }
}
