This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Groq API 설정

`.env.local` 파일을 생성하고 아래와 같이 Groq API 키를 추가하세요.

```
GROQ_API_KEY=your_groq_api_key
SERPAPI_KEY=your_serpapi_key
BING_NEWS_KEY=your_bing_news_key
KIS_APP_KEY=your_kis_app_key
KIS_APP_SECRET=your_kis_app_secret
KIS_BASE_URL=https://openapi.koreainvestment.com:9443
```

API 키는 서버에서만 사용되며 클라이언트로 노출되지 않습니다.

### KIS Developers 국내 주식 연동 가이드

1. KIS Developers에서 앱 등록 후 `KIS_APP_KEY`, `KIS_APP_SECRET` 발급
2. 모의투자/실투자 환경에 맞춰 `KIS_BASE_URL` 지정
3. `KIS_DOMESTIC_SYMBOLS`에 국내 종목코드(6자리) 10개 입력
4. `pnpm dev` 실행 후 `/domestic` 페이지에서 목록 확인

주의:
- 토큰은 서버에서만 발급/캐시됩니다.
- 호출 제한에 맞춰 종목 리스트를 10개로 제한합니다.

### AI 추천 로직 스펙

`/api/recommendations`는 아래 순서로 추천 종목을 생성합니다.

1. 입력 종목(`stocks`)에서 요청 마켓(`domestic`/`foreign`)만 필터링
2. 정량 점수 계산
   - `momentum = (history 마지막값 - 첫값) / 첫값 * 100`
   - `quantScore = momentum * 0.55 + change * 0.45`
3. `quantScore` 상위 8개를 LLM 후보군으로 축소
4. 후보별 뉴스 컨텍스트 수집
   - 우선순위: `SERPAPI` -> `BING_NEWS` -> `YAHOO` -> fallback 문구
5. Groq가 후보군 내에서 Top N(기본 3개) 추천 생성
   - 기본 파라미터: `riskProfile=balanced`, `horizon=swing`, `count=3`
6. 서버 응답 검증
   - 후보군 외 `symbol` 제거
   - `action`은 `buy/hold/avoid`만 허용
   - `score`(0~100), `confidence`(0~1) 범위 보정
7. LLM 응답 실패 시 정량 점수 기반 fallback 추천 반환

갱신 주기:
- 대시보드 추천 쿼리: 5분
- 대시보드 리스트 쿼리: 5분

주의:
- 본 기능은 투자 참고 정보이며, 투자 손익에 대한 책임은 사용자에게 있습니다.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
