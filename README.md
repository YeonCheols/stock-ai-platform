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
