import { expect, test } from "@playwright/test";

const mockStocks = [
  {
    id: "kis-005930",
    name: "삼성전자",
    symbol: "005930",
    market: "domestic",
    price: 70000,
    change: 1.23,
    history: [
      { date: "2026-03-01", value: 69500 },
      { date: "2026-03-02", value: 70000 },
    ],
  },
  {
    id: "kis-000660",
    name: "SK하이닉스",
    symbol: "000660",
    market: "domestic",
    price: 120000,
    change: -0.45,
    history: [
      { date: "2026-03-01", value: 121000 },
      { date: "2026-03-02", value: 120000 },
    ],
  },
];

const mockAnalysisText = JSON.stringify({
  sentiment: "Bullish",
  summary: "E2E 분석 요약",
  factorsUp: ["외국인 순매수"],
  factorsDown: ["매크로 불확실성"],
  risks: ["변동성 확대"],
  momentum: "단기 상승",
  newsSummary: ["실적 기대감 반영"],
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/stocks?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockStocks),
      headers: {
        "Cache-Control": "no-store",
        "X-Stock-Source": "mock",
      },
    });
  });

  await page.route("**/api/stock-analysis", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: mockAnalysisText,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  });
});

test("종목 리스트 조회가 정상 노출된다", async ({ page }) => {
  await page.goto("/domestic");

  await expect(
    page.getByRole("heading", { name: "주식 현황 및 AI 분석 대시보드" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /삼성전자/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /SK하이닉스/ })).toBeVisible();
  await expect(page.getByText("70,000원")).toBeVisible();
});

test("AI 분석 버튼으로 분석 결과가 갱신된다", async ({ page }) => {
  await page.goto("/domestic");

  await page.getByRole("button", { name: "AI 분석" }).nth(1).click();

  await expect(page.getByText("투자 감성: Bullish")).toBeVisible();
  await expect(page.getByText("E2E 분석 요약")).toBeVisible();
  await expect(page.getByText("외국인 순매수")).toBeVisible();
  await expect(page.getByText("매크로 불확실성")).toBeVisible();
});
