import Groq from "groq-sdk";
import type { Stock, StockHistoryPoint } from "@/types/stock";
import {
  fetchDomesticStocksFromKis,
  fetchForeignStocksFromKis,
} from "@/services/kisApi";

const computeChange = (history: StockHistoryPoint[]) => {
  if (history.length < 2) {
    return 0;
  }
  const prev = history[history.length - 2]?.value ?? 0;
  const current = history[history.length - 1]?.value ?? 0;
  if (prev === 0) {
    return 0;
  }
  return Number((((current - prev) / prev) * 100).toFixed(2));
};

const ensureHistory = (history: StockHistoryPoint[]) => {
  if (history.length >= 7) {
    return history.slice(-7);
  }
  if (history.length === 0) {
    const today = Date.now();
    return Array.from({ length: 7 }).map((_, index) => ({
      date: new Date(today - (6 - index) * 86400000).toISOString().slice(0, 10),
      value: 0,
    }));
  }
  const last = history[history.length - 1]?.value ?? 0;
  const padded = [...history];
  while (padded.length < 7) {
    const prev = padded[0]?.date
      ? new Date(padded[0].date).getTime()
      : Date.now();
    padded.unshift({
      date: new Date(prev - 86400000).toISOString().slice(0, 10),
      value: last,
    });
  }
  return padded;
};

const toNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toHistory = (history: unknown, fallback: StockHistoryPoint[]) => {
  if (!Array.isArray(history)) {
    return fallback;
  }
  const parsed = history
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const date = (item as { date?: unknown }).date;
      const value = (item as { value?: unknown }).value;
      if (typeof date !== "string" || typeof value !== "number") {
        return null;
      }
      return { date, value: Number(value.toFixed(0)) };
    })
    .filter((item): item is StockHistoryPoint => Boolean(item));
  return ensureHistory(parsed);
};

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomSymbol = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 3 })
    .map(() => chars[randomInt(0, chars.length - 1)])
    .join("");
};

const randomHistory = () => {
  const today = Date.now();
  const base = randomInt(20000, 200000);
  return Array.from({ length: 7 }).map((_, index) => ({
    date: new Date(today - (6 - index) * 86400000).toISOString().slice(0, 10),
    value: base + randomInt(-3000, 3000),
  }));
};

const fetchStocksFromGroq = async (): Promise<Stock[]> => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY가 설정되지 않았습니다.");
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const exampleHistory = randomHistory();
  const example = {
    id: `stk-${randomInt(100, 999)}`,
    name: `Example ${randomInt(1, 99)} Corp`,
    symbol: randomSymbol(),
    market: Math.random() > 0.5 ? "domestic" : "foreign",
    price: exampleHistory[exampleHistory.length - 1]?.value ?? 100000,
    change: Number(
      (
        ((exampleHistory[6].value - exampleHistory[5].value) /
          exampleHistory[5].value) *
        100
      ).toFixed(2)
    ),
    history: exampleHistory,
  };

  const prompt = [
    "가상의 주식 종목 리스트를 생성하고 최신 시장 분위기를 반영한 가격과 7일 가격 추이를 생성하세요.",
    "국내(domestic) 10개, 해외(foreign) 10개로 구성하세요.",
    "국내(domestic) 종목의 name은 반드시 한국어로 작성하세요.",
    "반드시 아래 JSON 형식으로만 응답하세요.",
    "각 종목은 id, symbol, name, market(domestic|foreign), price, change, history(7개) 필드를 포함합니다.",
    "history는 최근 7일 날짜(YYYY-MM-DD)와 price 값으로 구성하세요.",
    JSON.stringify(
      {
        stocks: [example],
      },
      null,
      2
    ),
  ].join("\n");

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "당신은 금융 데이터 애널리스트입니다." },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(content) as { stocks?: unknown };
  const items = Array.isArray(parsed.stocks) ? parsed.stocks : [];

  return items.map((item, index) => {
    const safeItem = item as Partial<Stock> & {
      history?: StockHistoryPoint[];
    };
    const history = toHistory(safeItem.history, []);
    const price = toNumber(
      safeItem.price,
      history[history.length - 1]?.value ?? 0
    );
    const change = toNumber(safeItem.change, computeChange(history));
    const market =
      safeItem.market === "domestic" || safeItem.market === "foreign"
        ? safeItem.market
        : index % 2 === 0
        ? "domestic"
        : "foreign";

    return {
      id: safeItem.id ?? crypto.randomUUID(),
      name: safeItem.name ?? "AI Generated",
      symbol: safeItem.symbol ?? "AI",
      market,
      price: Number(price.toFixed(0)),
      change,
      history,
    };
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market");
  const ranking =
    searchParams.get("ranking") === "tradeAmount" ? "tradeAmount" : "volume";

  if (market === "domestic") {
    try {
      const domestic = await fetchDomesticStocksFromKis(ranking);
      return Response.json(domestic, {
        headers: {
          "Cache-Control": "no-store",
          "X-Stock-Source": "kis",
        },
      });
    } catch (error) {
      const message = (error as Error).message;
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(message) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
      let detailBody: unknown = null;
      if (parsed && typeof parsed.body === "string") {
        try {
          detailBody = JSON.parse(parsed.body);
        } catch {
          detailBody = parsed.body;
        }
      }
      return Response.json(
        {
          source: "kis",
          error: message,
          detail: parsed,
          detailBody,
        },
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

  if (market === "foreign") {
    try {
      const foreign = await fetchForeignStocksFromKis();
      return Response.json(foreign, {
        headers: {
          "Cache-Control": "no-store",
          "X-Stock-Source": "kis",
        },
      });
    } catch (error) {
      const message = (error as Error).message;
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(message) as Record<string, unknown>;
      } catch {
        parsed = null;
      }
      let detailBody: unknown = null;
      if (parsed && typeof parsed.body === "string") {
        try {
          detailBody = JSON.parse(parsed.body);
        } catch {
          detailBody = parsed.body;
        }
      }
      return Response.json(
        {
          source: "kis",
          error: message,
          detail: parsed,
          detailBody,
        },
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

  try {
    const aiStocks = await fetchStocksFromGroq();
    if (!aiStocks.length) {
      throw new Error("Groq 응답에 종목 데이터가 없습니다.");
    }
    const filtered =
      market === "foreign"
        ? aiStocks.filter((stock) => stock.market === "foreign")
        : aiStocks;

    return Response.json(filtered, {
      headers: {
        "Cache-Control": "no-store",
        "X-Stock-Source": "groq",
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    return Response.json(
      {
        source: "groq",
        error: message,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Stock-Source": "error",
        },
      }
    );
  }
}
