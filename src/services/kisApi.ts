import "server-only";

import { unzipSync } from "fflate";
import iconv from "iconv-lite";
import type { Stock, StockHistoryPoint } from "@/types/stock";

const KIS_BASE_URL =
  process.env.KIS_BASE_URL ?? "https://openapi.koreainvestment.com:9443";

const HOT_CANDIDATE_COUNT = 20;
type DomesticRanking = "volume" | "tradeAmount";
const FOREIGN_EXCHANGES = ["NAS", "NYS"];
const MASTER_BASE_URL = "https://new.real.download.dws.co.kr/common/master";
const DOMESTIC_MASTER_FILES = [
  "kospi_code.mst.zip",
  "kosdaq_code.mst.zip",
  "konex_code.mst.zip",
];
const DOMESTIC_MASTER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type KisTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: KisTokenCache | null = null;
let tokenRequestInFlight: Promise<string> | null = null;
let domesticMasterCache:
  | {
      expiresAt: number;
      items: Array<{ symbol: string; name: string }>;
    }
  | null = null;

const getAccessToken = async () => {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.accessToken;
  }
  if (tokenRequestInFlight) {
    return tokenRequestInFlight;
  }

  tokenRequestInFlight = (async () => {
    const appKey = process.env.KIS_APP_KEY;
    const appSecret = process.env.KIS_APP_SECRET;
    if (!appKey || !appSecret) {
      throw new Error("KIS_APP_KEY 또는 KIS_APP_SECRET이 없습니다.");
    }

    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        JSON.stringify({
          status: response.status,
          body: errorBody,
          endpoint: "oauth2/tokenP",
        })
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!data.access_token) {
      throw new Error("KIS 토큰 발급 응답이 비어 있습니다.");
    }

    tokenCache = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  })();

  try {
    return await tokenRequestInFlight;
  } finally {
    tokenRequestInFlight = null;
  }
};

const parseHistoryFromDaily = (items: Array<Record<string, unknown>>) => {
  const parsed = items
    .map((item) => {
      const rawDate = item.stck_bsop_date;
      const rawValue = item.stck_clpr ?? item.stck_prpr;
      if (typeof rawDate !== "string" || typeof rawValue !== "string") {
        return null;
      }
      const y = rawDate.slice(0, 4);
      const m = rawDate.slice(4, 6);
      const d = rawDate.slice(6, 8);
      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        return null;
      }
      return { date: `${y}-${m}-${d}`, value: Number(value.toFixed(0)) };
    })
    .filter((item): item is StockHistoryPoint => Boolean(item));
  return parsed.sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
};

const buildFlatHistory = (price: number): StockHistoryPoint[] => {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => ({
    date: new Date(today.getTime() - (6 - index) * 86400000)
      .toISOString()
      .slice(0, 10),
    value: Number(price.toFixed(0)),
  }));
};

const pickSymbolField = (item: Record<string, unknown>) => {
  const candidates = [
    "mksc_shrn_iscd",
    "stck_shrn_iscd",
    "stck_code",
    "stck_shrn_iscd2",
    "code",
    "symb",
    "symbol",
    "ovrs_pdno",
    "pdno",
  ];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const pickOverseasNameField = (item: Record<string, unknown>) => {
  const candidates = [
    "name",
    "prdt_name",
    "kor_isnm",
    "eng_name",
    "hts_kor_isnm",
  ];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};


const pickOverseasPrice = (item: Record<string, unknown>) => {
  const candidates = [
    "last",
    "price",
    "prpr",
    "ovrs_prpr",
    "ovrs_nmix_prpr",
    "stck_prpr",
  ];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" || typeof value === "number") {
      const num = Number(value);
      if (Number.isFinite(num)) {
        return num;
      }
    }
  }
  return 0;
};

const fetchOverseasTradeVol = async (token: string, excd: string) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(
    `${KIS_BASE_URL}/uapi/overseas-stock/v1/ranking/trade-vol`
  );
  url.searchParams.set("EXCD", excd);
  url.searchParams.set("NDAY", "0");
  url.searchParams.set("VOL_RANG", "0");
  url.searchParams.set("KEYB", "");
  url.searchParams.set("AUTH", "");
  url.searchParams.set("PRC1", "");
  url.searchParams.set("PRC2", "");

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "HHDFS76310010",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "ranking/trade-vol",
        excd,
      })
    );
  }

  const rawBody = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const outputCandidates = [
    data.output,
    data.output1,
    data.output2,
  ] as Array<unknown>;
  const output =
    outputCandidates.find((candidate) => Array.isArray(candidate)) ?? [];
  const outputList = Array.isArray(output) ? output : [];
  if (outputList.length === 0) {
    throw new Error(
      JSON.stringify({
        status: 200,
        body: rawBody,
        endpoint: "ranking/trade-vol",
        excd,
        message: "해외 거래량순위 리스트가 비어 있습니다.",
      })
    );
  }
  return outputList as Array<Record<string, unknown>>;
};

const parseNumeric = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const num = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
    return Number.isFinite(num) ? num : 0;
  }
  return 0;
};

const normalizeDomesticSymbol = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 6 ? digits.slice(-6) : "";
};

const parseDomesticMasterContent = (content: string) => {
  const rows = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return rows
    .map((row) => {
      if (row.length <= 228) {
        return null;
      }
      const head = row.slice(0, row.length - 228);
      const symbol = normalizeDomesticSymbol(head.slice(0, 9).trim());
      const name = head.slice(21).trim();
      if (!symbol || !name) {
        return null;
      }
      return { symbol, name };
    })
    .filter((item): item is { symbol: string; name: string } => Boolean(item));
};

const downloadDomesticMasterFile = async (fileName: string) => {
  const response = await fetch(`${MASTER_BASE_URL}/${fileName}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: await response.text(),
        endpoint: fileName,
      })
    );
  }

  const zipBytes = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(zipBytes);
  const firstFile = Object.values(files)[0];
  if (!firstFile) {
    return [] as Array<{ symbol: string; name: string }>;
  }
  const decoded = iconv.decode(Buffer.from(firstFile), "cp949");
  return parseDomesticMasterContent(decoded);
};

const getDomesticMasterItems = async () => {
  if (domesticMasterCache && domesticMasterCache.expiresAt > Date.now()) {
    return domesticMasterCache.items;
  }

  const fileResults = await Promise.all(
    DOMESTIC_MASTER_FILES.map((fileName) => downloadDomesticMasterFile(fileName))
  );
  const merged = fileResults.flat().reduce<Array<{ symbol: string; name: string }>>(
    (acc, item) => {
      if (!acc.some((existing) => existing.symbol === item.symbol)) {
        acc.push(item);
      }
      return acc;
    },
    []
  );

  domesticMasterCache = {
    expiresAt: Date.now() + DOMESTIC_MASTER_CACHE_TTL_MS,
    items: merged,
  };
  return merged;
};

const fetchDomesticQuoteQuick = async (symbol: string, token: string) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(`${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", symbol);

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "FHKST01010100",
    },
  });

  if (!response.ok) {
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: await response.text(),
        endpoint: "quotations/inquire-price",
        symbol,
      })
    );
  }

  const data = (await response.json()) as { output?: Record<string, string> };
  const output = data.output ?? {};
  return {
    price: Number(output.stck_prpr ?? 0),
    change: Number(output.prdy_ctrt ?? 0),
  };
};

const pickOverseasChange = (item: Record<string, unknown>) => {
  const changeRateCandidates = [
    "ovrs_prdy_ctrt",
    "prdy_ctrt",
    "chng_rate",
    "change_rate",
    "prdy_vrss_rt",
    "rate",
  ];
  for (const key of changeRateCandidates) {
    const value = parseNumeric(item[key]);
    if (value !== 0) {
      return Number(value.toFixed(2));
    }
  }

  const diffCandidates = [
    "ovrs_prdy_vrss",
    "prdy_vrss",
    "change",
    "diff",
    "ovrs_nmix_prdy_vrss",
  ];
  const prevCloseCandidates = [
    "ovrs_prdy_clpr",
    "prdy_clpr",
    "prev_close",
    "base",
    "ovrs_nmix_prdy_clpr",
  ];
  const diff =
    diffCandidates
      .map((key) => parseNumeric(item[key]))
      .find((value) => value !== 0) ?? 0;
  const prevClose =
    prevCloseCandidates
      .map((key) => parseNumeric(item[key]))
      .find((value) => value > 0) ?? 0;
  if (diff !== 0 && prevClose > 0) {
    return Number(((diff / prevClose) * 100).toFixed(2));
  }
  return 0;
};

const fetchHotSymbols = async (token: string, ranking: DomesticRanking) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/volume-rank`
  );
  url.searchParams.set("fid_cond_mrkt_div_code", "J");
  url.searchParams.set("fid_cond_scr_div_code", "20171");
  url.searchParams.set("fid_input_iscd", "0000");
  url.searchParams.set("fid_div_cls_code", "0");
  url.searchParams.set("fid_blng_cls_code", "0");
  url.searchParams.set("fid_trgt_cls_code", "111111111");
  url.searchParams.set("fid_trgt_exls_cls_code", "0000000000");
  url.searchParams.set("fid_input_price_1", "0");
  url.searchParams.set("fid_input_price_2", "0");
  url.searchParams.set("fid_vol_cnt", "0");
  url.searchParams.set("fid_input_date_1", "");

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "FHPST01710000",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "quotations/volume-rank",
      })
    );
  }

  const rawBody = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const outputCandidates = [
    data.output,
    data.output1,
    data.output2,
  ] as Array<unknown>;
  const output =
    outputCandidates.find((candidate) => Array.isArray(candidate)) ?? [];
  const outputList = Array.isArray(output) ? output : [];
  const entries = outputList.map((item) => {
    const record = item as Record<string, unknown>;
    const tradeAmount = parseNumeric(record.acml_tr_pbmn);
    return {
      symbol: pickSymbolField(record),
      tradeAmount,
    };
  });

  const symbols =
    ranking === "tradeAmount"
      ? entries
          .filter((entry) => entry.symbol)
          .sort((a, b) => b.tradeAmount - a.tradeAmount)
          .map((entry) => entry.symbol)
      : entries.filter((entry) => entry.symbol).map((entry) => entry.symbol);

  if (symbols.length === 0) {
    throw new Error(
      JSON.stringify({
        status: 200,
        body: rawBody,
        endpoint: "quotations/volume-rank",
        message: "KIS 거래량순위 리스트가 비어 있습니다.",
      })
    );
  }

  return symbols.slice(0, HOT_CANDIDATE_COUNT);
};

const pickNameField = (output: Record<string, string>) => {
  const candidates = [
    "prdt_abrv_name",
    "prdt_name",
    "prdtnm",
    "kor_isnm",
    "hts_kor_isnm",
    "prdt_krn_name",
  ];
  for (const key of candidates) {
    const value = output[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const fetchStockInfoName = async (symbol: string, token: string) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/search-stock-info`
  );
  url.searchParams.set("PRDT_TYPE_CD", "300");
  url.searchParams.set("PDNO", symbol);

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "CTPF1002R",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "quotations/search-stock-info",
        symbol,
      })
    );
  }

  const data = (await response.json()) as {
    output?: Record<string, string> | Array<Record<string, string>>;
  };
  const output = Array.isArray(data.output) ? data.output[0] : data.output;
  if (!output) {
    return "";
  }
  return pickNameField(output);
};
const fetchDailyHistory = async (symbol: string, token: string) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`
  );
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", symbol);
  url.searchParams.set("FID_PERIOD_DIV_CODE", "D");
  url.searchParams.set("FID_ORG_ADJ_PRC", "1");
  const today = new Date();
  const toYmd = (date: Date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(date.getDate()).padStart(2, "0")}`;
  const endDate = toYmd(today);
  const startDate = toYmd(new Date(today.getTime() - 14 * 86400000));
  url.searchParams.set("FID_INPUT_DATE_1", startDate);
  url.searchParams.set("FID_INPUT_DATE_2", endDate);

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "FHKST03010100",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "quotations/inquire-daily-itemchartprice",
        symbol,
      })
    );
  }

  const data = (await response.json()) as {
    output2?: Array<Record<string, unknown>>;
  };
  if (!data.output2) {
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: JSON.stringify(data),
        endpoint: "quotations/inquire-daily-itemchartprice",
        symbol,
      })
    );
  }
  return parseHistoryFromDaily(data.output2);
};

const fetchPrice = async (symbol: string, token: string) => {
  const appKey = process.env.KIS_APP_KEY ?? "";
  const appSecret = process.env.KIS_APP_SECRET ?? "";
  const url = new URL(
    `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`
  );
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", symbol);

  const response = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: "FHKST01010100",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      JSON.stringify({
        status: response.status,
        body: errorBody,
        endpoint: "quotations/inquire-price",
      })
    );
  }

  const data = (await response.json()) as {
    output?: Record<string, string>;
  };
  const output = data.output ?? {};
  const price = Number(output.stck_prpr ?? 0);
  const change = Number(output.prdy_ctrt ?? 0);
  let name = output.hts_kor_isnm ?? "";
  if (!name) {
    name = await fetchStockInfoName(symbol, token);
  }
  if (!name) {
    throw new Error(`KIS 종목명이 없습니다 symbol=${symbol}`);
  }

  return { price, change, name };
};

export const fetchDomesticStocksFromKis = async (
  ranking: DomesticRanking
): Promise<Stock[]> => {
  const token = await getAccessToken();
  const symbols = await fetchHotSymbols(token, ranking);

  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const quote = await fetchPrice(symbol, token);
      const history = await fetchDailyHistory(symbol, token);
      return {
        id: `kis-${symbol}`,
        name: quote.name,
        symbol,
        market: "domestic" as const,
        price: Number(quote.price.toFixed(0)),
        change: Number(quote.change.toFixed(2)),
        history,
      };
    })
  );

  const entries: Stock[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      entries.push(result.value);
    } else {
      const symbol = symbols[index] ?? "unknown";
      console.warn(
        "[kis] hot item failed symbol=%s reason=%s",
        symbol,
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
      );
    }
  });

  if (entries.length === 0) {
    throw new Error("KIS 핫 종목 상세 조회에 실패했습니다.");
  }

  return entries.slice(0, HOT_CANDIDATE_COUNT);
};

export const fetchForeignStocksFromKis = async (): Promise<Stock[]> => {
  const token = await getAccessToken();
  const lists = await Promise.all(
    FOREIGN_EXCHANGES.map((excd) => fetchOverseasTradeVol(token, excd))
  );
  const merged = lists.flat().slice(0, HOT_CANDIDATE_COUNT);

  return merged.slice(0, HOT_CANDIDATE_COUNT).map((item) => {
    const symbol = pickSymbolField(item) || "UNKNOWN";
    const name = pickOverseasNameField(item) || symbol;
    const price = pickOverseasPrice(item);
    const change = pickOverseasChange(item);
    return {
      id: `kis-${symbol}`,
      name,
      symbol,
      market: "foreign",
      price: Number(price.toFixed(2)),
      change,
      history: buildFlatHistory(price),
    };
  });
};

export const searchStocksFromKis = async (query: string): Promise<Stock[]> => {
  const keyword = query.trim();
  if (!keyword) {
    return [];
  }
  const token = await getAccessToken();
  const lowered = keyword.toLowerCase();
  const domesticMaster = await getDomesticMasterItems();
  const matchedDomestic = domesticMaster
    .filter((item) => {
      const name = item.name.toLowerCase();
      const symbol = item.symbol.toLowerCase();
      return name.includes(lowered) || symbol.includes(lowered);
    })
    .slice(0, 20);

  const domesticResultsSettled = await Promise.allSettled(
    matchedDomestic.map(async (item) => {
      const quote = await fetchDomesticQuoteQuick(item.symbol, token);
      return {
        id: `kis-${item.symbol}`,
        name: item.name,
        symbol: item.symbol,
        market: "domestic" as const,
        price: Number(quote.price.toFixed(0)),
        change: Number(quote.change.toFixed(2)),
        history: buildFlatHistory(quote.price),
      };
    })
  );
  const domesticResults = domesticResultsSettled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );

  const foreignCandidates = await fetchForeignStocksFromKis().catch(() => []);
  const foreignResults = foreignCandidates.filter((stock) => {
    const name = stock.name.toLowerCase();
    const symbol = stock.symbol.toLowerCase();
    return name.includes(lowered) || symbol.includes(lowered);
  });

  return [...domesticResults, ...foreignResults].slice(0, 20);
};

export const fetchStockByIdFromKis = async (stockId: string): Promise<Stock> => {
  const symbol = stockId.replace(/^kis-/, "").trim().toUpperCase();
  if (!symbol) {
    throw new Error("유효한 종목 ID가 아닙니다.");
  }

  const token = await getAccessToken();
  const isDomesticSymbol = /^\d{6}$/.test(symbol);

  if (isDomesticSymbol) {
    const quote = await fetchPrice(symbol, token);
    const history = await fetchDailyHistory(symbol, token);
    return {
      id: `kis-${symbol}`,
      name: quote.name,
      symbol,
      market: "domestic",
      price: Number(quote.price.toFixed(0)),
      change: Number(quote.change.toFixed(2)),
      history,
    };
  }

  const lists = await Promise.all(
    FOREIGN_EXCHANGES.map((excd) => fetchOverseasTradeVol(token, excd))
  );
  const merged = lists.flat();
  const matched = merged.find(
    (item) => pickSymbolField(item).toUpperCase() === symbol
  );

  if (!matched) {
    throw new Error(`KIS 종목을 찾을 수 없습니다 id=${stockId}`);
  }

  const name = pickOverseasNameField(matched) || symbol;
  const price = pickOverseasPrice(matched);
  const change = pickOverseasChange(matched);

  return {
    id: `kis-${symbol}`,
    name,
    symbol,
    market: "foreign",
    price: Number(price.toFixed(2)),
    change,
    history: buildFlatHistory(price),
  };
};
