# Investment Portfolio Tracker

A personal investment portfolio tracker built with React + Vite + TypeScript. Track US stocks, ETFs, Thai mutual funds, Thai stocks & DRs, gold, crypto, and cash — all in one place.

## Features

- **7 asset categories** with dedicated pages: US Stocks, ETFs, Thai Mutual Funds, Thai Stocks & DRs, Emergency Funds & Cash, Gold, Cryptocurrency
- **Live market prices** via Yahoo Finance (stocks, ETFs, Thai stocks) and CoinGecko (crypto)
- **Automatic exchange rate** (USD ↔ THB) via open.er-api.com
- **Currency toggle** — view all values in THB or USD
- **Full portfolio table** with: Avg. Cost, Units, Market Price, Market Value, Cost Basis, P&L, P&L %, Goal Price, To Goal %
- **Charts** — allocation pie chart + P&L bar chart per category; portfolio-level charts on Summary page
- **Summary dashboard** — total value, P&L, allocation breakdown, category table
- **Asset icons** — Clearbit logos for US stocks, CoinGecko images for crypto, emoji fallbacks
- **Persistent storage** — all data stored in browser localStorage (no account or server needed)
- **Dark / light mode** — follows your system preference

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Data Sources

| Asset Type | Price Source | Ticker Format |
|---|---|---|
| US Stocks | Yahoo Finance | `AAPL`, `MSFT`, `NVDA` |
| ETFs | Yahoo Finance | `SPY`, `QQQ`, `VTI` |
| Thai Stocks | Yahoo Finance | `PTT.BK`, `CPALL.BK` |
| DRs | Yahoo Finance | `AAPL-R.BK` |
| Gold (futures) | Yahoo Finance | `GC=F` |
| Gold (ETF) | Yahoo Finance | `GLD` or `SPDR.BK` |
| Crypto | CoinGecko | `BTC`, `ETH`, `SOL` (+ CoinGecko ID) |
| Thai Mutual Funds | Manual / Yahoo Finance | Some funds: `KFLTFDIV-A.BK` |
| Cash & Emergency | Manual price override | Any label |

### Thai Mutual Funds — NAV Data

Thai mutual fund NAVs are **not available** from a free public API without authentication. Options:

1. **Manual price override** — enter the latest NAV in the "Manual Price Override" field. Update daily from:
   - Your fund company's app (KASSET, SCBAM, Krungsri Asset, etc.)
   - [Finnomena](https://www.finnomena.com/)
   - [Morningstar Thailand](https://www.morningstar.in.th/)
2. **Yahoo Finance** — some Thai fund ETFs are listed with `.BK` suffix. Try typing the fund code + `.BK`.

## Tech Stack

- **React 18** + **Vite 6** + **TypeScript 5**
- **Zustand** (state + localStorage persistence)
- **React Router v6** (HashRouter — no server needed)
- **Recharts** (charts)
- **shadcn/ui** style components + **Radix UI** primitives
- **Tailwind CSS**
- **Lucide React** icons

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui-style components
│   ├── AssetForm.tsx    # Add/edit asset dialog
│   ├── AssetIcon.tsx    # Icons for each asset
│   ├── AssetTable.tsx   # Holdings table
│   ├── CategoryChart.tsx # Pie + bar charts
│   ├── Header.tsx       # Top bar (currency toggle, exchange rate)
│   └── Sidebar.tsx      # Navigation
├── pages/
│   ├── CategoryPage.tsx # Reusable page for all 7 categories
│   └── Summary.tsx      # Portfolio overview
├── services/
│   ├── exchangeRate.ts  # open.er-api.com integration
│   └── marketData.ts    # Yahoo Finance + CoinGecko
├── store/
│   └── portfolioStore.ts # Zustand store (persisted)
├── types/index.ts
└── utils/
    ├── calculations.ts
    └── formatters.ts
```

## Build for Production

```bash
npm run build
npm run preview
```

The built output in `dist/` is a static site you can open directly with a browser (uses hash-based routing).
