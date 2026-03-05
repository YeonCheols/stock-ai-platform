import Groq from "groq-sdk";
import type { StockPriceSnapshot } from "@/types/stock";
import {
  MODEL_NAME,
  buildUserPrompt,
  fetchNewsContext,
  systemPrompt,
} from "@/services/aiAnalysis";

const parseRequest = async (request: Request) => {
  const body = (await request.json()) as {
    symbol?: string;
    priceData?: StockPriceSnapshot;
  };
  if (!body?.symbol || !body.priceData) {
    return null;
  }
  return body as { symbol: string; priceData: StockPriceSnapshot };
};

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY", { status: 500 });
  }

  const payload = await parseRequest(request);
  if (!payload) {
    return new Response("Invalid request", { status: 400 });
  }

  const { symbol, priceData } = payload;
  try {
    const newsContext = await fetchNewsContext(symbol);
    const userPrompt = buildUserPrompt(symbol, priceData, newsContext);
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    let body = "";
    let status = 500;
    if (error && typeof error === "object") {
      const anyError = error as { status?: number; message?: string };
      status = anyError.status ?? 500;
      body = anyError.message ?? "Groq 요청 실패";
    } else {
      body = "Groq 요청 실패";
    }
    return new Response(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
