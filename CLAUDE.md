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
- **Icons**: Lucide React + Google S2 favicon API + CoinGecko image URLs
- **APIs**: Yahoo Finance proxy, CoinGecko proxy, open.er-api.com, Finnomena (all via Vite dev proxy/plugin)

## Key Architecture Decisions

### Single CategoryPage component
All 7 asset category pages (`/us-stocks`, `/etfs`, `/thai-mutual-funds`, `/thai-stocks-drs`, `/emergency-cash`, `/gold`, `/crypto`) render the same `CategoryPage` component with a `category` prop. Config (titles, data notes, ticker hints) is kept in `CATEGORY_INFO` inside that file.

### Price flow
1. Assets stored with `priceCurrency` (`THB` or `USD`)
2. `fetchPricesForAssets()` routes to Yahoo Finance (non-crypto) or CoinGecko (crypto)
3. Assets with `manualPrice` skip API fetch
4. `lastPriceFetched` is persisted per asset so prices survive page reload
5. `convertCurrency()` handles THB↔USD conversion for display

### Yahoo Finance proxy (custom Vite plugin)
Yahoo Finance requires a session cookie (`A1`) + crumb token on every API request. The simple Vite `proxy` config is insufficient. A custom Vite plugin in `vite.config.ts` handles this:
1. Fetches the `A1` cookie from `https://fc.yahoo.com` (Yahoo's dedicated first-cookie endpoint)
2. Exchanges the cookie for a crumb via `https://query2.finance.yahoo.com/v1/test/getcrumb`
3. Appends `?crumb=...` to every `/api/yahoo/*` request forwarded with `node:https`
4. Caches auth for 30 minutes; auto-refreshes on 401

Uses `node:https` (not `fetch`/undici) to avoid TLS issues on Windows. Requires `maxHeaderSize: 81920` because Yahoo's response headers exceed Node's 16 KB default.

### Import / Export
`src/utils/dataIO.ts` handles JSON export (triggers browser download) and import (parses + validates file). The payload format (v2) groups assets by category: `{ version: 2, assets: { "us-stocks": [...], "crypto": [...] } }`. `flattenExport()` collapses the category map back to `Asset[]` for use with the store. `importAssets(assets, mode)` in the store supports `merge` (skip duplicate IDs) and `replace` (overwrite all). See README for the full JSON payload format.

### Adding a new API / data source
- Add a new fetch function in `src/services/marketData.ts`
- Route to it in `fetchPricesForAssets()` based on category or a new asset field

### Thai Mutual Funds
NAV is fetched from Finnomena's public API (`/fn3/api/fund/v2/public/funds/{fund_id}/latest`) via the `/api/finnomena-public` proxy — **no credentials required**. The fund's `fund_id` (e.g. `F00001CKTY`) is stored on the asset as `finnomenaFundId` and resolved at fetch time. Assets without a `fund_id` fall back to a cache lookup by `short_code`; if neither is available the asset skips auto-price.

The ticker input in AssetForm for `thai-mutual-funds` shows a live search autocomplete backed by `/fn3/api/fund/v2/public/funds` (7 056 funds, cached in memory). Selecting a result populates `ticker` (= `short_code`), `name` (Thai name), and `finnomenaFundId`.

`FINNOMENA_EMAIL` / `FINNOMENA_PASSWORD` in `.env.local` are still supported (server-side only) for the auth-gated `/api/finnomena/*` proxy, but are no longer required for NAV fetching. Falls back to manual price override if neither auto-price source works. See README for setup.

### Emergency Funds & Cash
No live pricing — `fetchPricesForAssets()` excludes this category entirely. The `AssetForm` shows a reduced field set for this category (`ticker`/Buy-Sell-Goal/Manual-Price-Override inputs are hidden): just **Name**, **Price Currency**, and **Amount**. On submit, `units` is hardcoded to `1` and both `avgCost` and `manualPrice` are set to the entered amount, so `costBasis === currentValue` (no P&L) and `ticker` is auto-derived from `name`. When editing an existing asset, the Amount field is pre-filled with `avgCost * units` so older multi-unit entries normalize to the new convention on save.

## File Map
| Path | Purpose |
|---|---|
| `src/types/index.ts` | All TypeScript interfaces |
| `src/store/portfolioStore.ts` | Zustand store — assets, displayCurrency, exchangeRate, importAssets |
| `src/services/marketData.ts` | Yahoo Finance + CoinGecko fetch helpers |
| `src/services/exchangeRate.ts` | open.er-api.com fetch |
| `src/utils/calculations.ts` | `calcAsset()`, `convertCurrency()`, `buildPortfolioSummary()` |
| `src/utils/dataIO.ts` | `exportToJson()`, `parseImportFile()` — JSON import/export |
| `src/utils/formatters.ts` | `formatCurrency()`, `formatPercent()`, `formatNumber()` |
| `src/components/AssetTable.tsx` | Main data table with sortable columns |
| `src/components/AssetForm.tsx` | Add/edit asset modal dialog |
| `src/components/AssetIcon.tsx` | Logo/emoji icons per asset — Parqet CDN (`assets.parqet.com/logos/symbol/{TICKER}`) for US stocks, ETFs, and Thai stocks (`.BK`); DR tickers (`AAPL-R.BK`) strip `-R.BK` to resolve the underlying logo; CoinGecko images for crypto; emoji fallback |
| `src/components/CategoryChart.tsx` | Allocation pie + P&L bar charts |
| `src/components/Header.tsx` | Top bar — currency toggle, exchange rate, Import/Export button |
| `src/components/ImportExportDialog.tsx` | Import / Export modal (merge or replace mode) |
| `src/components/Sidebar.tsx` | Nav sidebar with asset counts |
| `src/hooks/useTheme.ts` | Theme mode — three modes: `light`, `dark`, `auto`; persisted to `localStorage` as `themeMode`; auto resolves to light (06:00–20:00) or dark by local hour, rechecks every 60 s; `cycleMode()` steps light → dark → auto → light |
| `src/pages/CategoryPage.tsx` | Shared page for all 7 categories |
| `src/pages/Summary.tsx` | Portfolio dashboard |
| `vite.config.ts` | Vite config + custom Yahoo Finance plugin + CoinGecko/exchangerate proxies |

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
- `/api/yahoo/*` → `https://query1.finance.yahoo.com/*` (custom Vite plugin — cookie+crumb auth via fc.yahoo.com)
- `/api/finnomena/*` → `https://www.finnomena.com/*` (custom Vite plugin — email/password auth → access_token cookie)
- `/api/finnomena-public/*` → `https://www.finnomena.com/*` (simple proxy — no auth, for public endpoints)
- `/api/coingecko/*` → `https://api.coingecko.com/*`
- `/api/exchangerate/*` → `https://open.er-api.com/*`
