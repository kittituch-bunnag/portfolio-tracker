# Investment Portfolio Tracker — Claude Instructions

## Project Overview
Single-page React app (Vite + TypeScript) for personal investment portfolio tracking. No backend — data persisted in browser `localStorage` via Zustand.

## Stack
- **Framework**: React 18 + Vite 6
- **Language**: TypeScript (strict mode)
- **State**: Zustand with `persist` middleware (`investment-portfolio-v1` key)
- **Routing**: React Router v6, `HashRouter`
- **Styling**: Tailwind CSS + shadcn/ui-style components (src/components/ui/)
- **Charts**: Recharts
- **Icons**: Lucide React + Clearbit logo API + CoinGecko image URLs
- **APIs**: Yahoo Finance proxy, CoinGecko proxy, open.er-api.com (all via Vite dev proxy)

## Key Architecture Decisions

### Single CategoryPage component
All 7 asset category pages (`/us-stocks`, `/etfs`, `/thai-mutual-funds`, `/thai-stocks-drs`, `/emergency-cash`, `/gold`, `/crypto`) render the same `CategoryPage` component with a `category` prop. Config (titles, data notes, ticker hints) is kept in `CATEGORY_INFO` inside that file.

### Price flow
1. Assets stored with `priceCurrency` (`THB` or `USD`)
2. `fetchPricesForAssets()` routes to Yahoo Finance (non-crypto) or CoinGecko (crypto)
3. Assets with `manualPrice` skip API fetch
4. `lastPriceFetched` is persisted per asset so prices survive page reload
5. `convertCurrency()` handles THB↔USD conversion for display

### Adding a new API / data source
- Add a new fetch function in `src/services/marketData.ts`
- Route to it in `fetchPricesForAssets()` based on category or a new asset field

### Thai Mutual Funds
No free public NAV API exists. Users enter a manual price override. If the fund has a `.BK` Yahoo Finance ticker, they can use that. See README for details.

## File Map
| Path | Purpose |
|---|---|
| `src/types/index.ts` | All TypeScript interfaces |
| `src/store/portfolioStore.ts` | Zustand store — assets, displayCurrency, exchangeRate |
| `src/services/marketData.ts` | Yahoo Finance + CoinGecko fetch helpers |
| `src/services/exchangeRate.ts` | open.er-api.com fetch |
| `src/utils/calculations.ts` | `calcAsset()`, `convertCurrency()`, `buildPortfolioSummary()` |
| `src/utils/formatters.ts` | `formatCurrency()`, `formatPercent()`, `formatNumber()` |
| `src/components/AssetTable.tsx` | Main data table with sortable columns |
| `src/components/AssetForm.tsx` | Add/edit asset modal dialog |
| `src/components/AssetIcon.tsx` | Logo/emoji icons per asset |
| `src/components/CategoryChart.tsx` | Allocation pie + P&L bar charts |
| `src/components/Header.tsx` | Top bar with currency toggle |
| `src/components/Sidebar.tsx` | Nav sidebar with asset counts |
| `src/pages/CategoryPage.tsx` | Shared page for all 7 categories |
| `src/pages/Summary.tsx` | Portfolio dashboard |
| `vite.config.ts` | Vite config + API proxies |

## Dev Commands
```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview production build
```

## Lint / Type Check
```bash
npx tsc --noEmit   # type check
```

## localStorage Key
`investment-portfolio-v1` — clear this key to reset all data.

## Proxied API Endpoints
- `/api/yahoo/*` → `https://query1.finance.yahoo.com/*`
- `/api/coingecko/*` → `https://api.coingecko.com/*`
- `/api/exchangerate/*` → `https://open.er-api.com/*`
