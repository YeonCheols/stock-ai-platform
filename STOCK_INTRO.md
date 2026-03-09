# 📈 Stock AI Platform 프로젝트 소개

## 📋 개요

`stock-ai-platform`은 **국내/해외 주식 데이터를 실시간으로 조회하고, AI 기반 분석 및 추천을 제공하는 대시보드형 웹 서비스**입니다.  
KIS Open API를 통해 종목 데이터를 수집하고, Groq LLM으로 뉴스 컨텍스트 기반 인사이트를 생성해 투자 판단에 참고할 수 있는 정보를 제공합니다.

---

## 🛠️ 기술 스택

### Core Technologies

- **Next.js 16.1.6 (App Router)** - 풀스택 웹 애플리케이션 프레임워크
- **React 19.2.3** - UI 컴포넌트 기반 렌더링
- **TypeScript 5.x** - 정적 타입 시스템
- **TanStack Query 5.x** - 서버 상태 캐싱/동기화

### Data & AI

- **KIS Open API** - 국내/해외 종목 시세 및 랭킹 데이터 소스
- **Groq SDK** - 종목 분석 및 추천 생성 LLM 호출
- **SerpAPI / Bing News / Yahoo Finance** - 뉴스 컨텍스트 수집(폴백 체인)
- **Supabase** - KIS 액세스 토큰 저장 및 분산 락 기반 갱신(선택 사용)

### UI & Visualization

- **Tailwind CSS 4** - 유틸리티 기반 스타일링
- **lightweight-charts** - 가격 히스토리 차트 렌더링
- **lucide-react** - 아이콘 시스템

### Testing & Quality

- **Vitest + Testing Library + jsdom** - 단위/컴포넌트 테스트
- **Playwright** - E2E 시나리오 테스트
- **ESLint 9 + eslint-config-next** - 코드 품질 관리

---

## ⚡ 주요 기능

### 1) 국내/해외 주식 대시보드

- 기본 진입 시 `/domestic`으로 리다이렉트
- 탭 기반으로 국내/해외 시장 전환
- 국내 종목은 **거래량/거래대금 기준 TOP 20** 필터 지원
- 종목 선택 시 우측 패널에서 AI 분석 결과 확인

### 2) 통합 종목 검색

- 종목명/티커 기준 `search` 페이지 제공
- 국내/해외 결과를 통합 조회
- 검색 결과에서 바로 AI 분석 실행 가능

### 3) AI 종목 분석 (Streaming)

- `POST /api/stock-analysis`를 통해 분석 결과를 스트리밍 텍스트로 수신
- 가격 히스토리 + 변동률 + 뉴스 컨텍스트를 함께 프롬프트로 전달
- 결과는 `Bullish/Bearish/Neutral`, 핵심 요약, 상승/하락 요인, 리스크 등 구조화된 JSON 포맷 기준으로 생성

### 4) AI 추천 TOP 3

- `POST /api/recommendations`에서 종목 후보군을 정량 점수로 1차 필터링
- 모멘텀/변동률 기반 `quantScore` 상위 후보 + 뉴스 컨텍스트를 결합해 추천 생성
- LLM 실패 시 정량 점수 기반 fallback 추천으로 서비스 연속성 보장
- 대시보드에서 5분 주기로 추천 자동 갱신

### 5) 안정적인 KIS 토큰 관리

- 토큰 발급/갱신 로직을 서비스 레이어로 분리
- Supabase 설정 시 `kis_tokens` 테이블 기반 분산 락으로 동시 갱신 충돌 완화
- Supabase 미설정 환경에서는 메모리 캐시 폴백으로 동작

---

## 🔌 주요 API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
| --- | --- | --- |
| `/api/stocks` | `GET` | 시장별 종목 리스트 조회 (`market`, `ranking`) |
| `/api/stocks/search` | `GET` | 종목명/티커 검색 (`q` 또는 `query`) |
| `/api/stocks/item` | `GET` | 특정 종목 상세 조회 (`id`) |
| `/api/stock-analysis` | `POST` | 단일 종목 AI 분석 스트리밍 |
| `/api/recommendations` | `POST` | 시장별 AI 추천 종목 반환 |

---

## 🔐 환경 변수

| 키 | 용도 |
| --- | --- |
| `GROQ_API_KEY` | AI 분석/추천 LLM 호출 |
| `SERPAPI_KEY` | 뉴스 컨텍스트 1순위 수집 |
| `BING_NEWS_KEY` | 뉴스 컨텍스트 2순위 수집 |
| `KIS_APP_KEY` | KIS API 인증 |
| `KIS_APP_SECRET` | KIS API 인증 |
| `KIS_BASE_URL` | KIS API Base URL |
| `SUPABASE_URL` | 토큰 저장소(Supabase) 연결 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서버 권한 키 |

---

## 🧪 테스트 및 개발 경험

### 테스트 구성

- API 라우트 테스트: `src/app/api/**/*.test.ts`
- 서비스 레이어 테스트: `src/services/*.test.ts`
- UI/훅 테스트: `src/components/**/*.test.tsx`, `src/hooks/*.test.tsx`
- E2E 테스트: `e2e/stock-flows.spec.ts`

### 실행 스크립트

- `pnpm dev` - 개발 서버 실행
- `pnpm test` - Vitest 실행
- `pnpm coverage` - 커버리지 리포트 생성
- `pnpm e2e` - Playwright E2E 실행

---

## 🎯 프로젝트 가치

- 실시간 주식 데이터와 AI 인사이트를 한 화면에서 제공해 탐색 시간을 단축
- 국내/해외 시장을 통합해 비교 분석 경험을 개선
- 외부 API 실패 상황에서도 fallback 경로를 갖춘 안정적인 사용자 경험 제공
