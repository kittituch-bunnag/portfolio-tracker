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
- **Asset icons** — Google favicon service for US stocks/ETFs, CoinGecko images for crypto, emoji fallbacks
- **Persistent storage** — all data stored in browser localStorage (no account or server needed)
- **Import / Export** — back up your portfolio to JSON or load data from a file (merge or replace)
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

## Import / Export

Click **Import / Export** in the header to back up or restore your portfolio.

### Export

Downloads a `portfolio-YYYY-MM-DD.json` file containing all your assets.

### Import

Accepts a JSON file in the format below. Two import modes:

- **Merge** — adds assets from the file; skips any with a duplicate `id`
- **Replace** — clears all current assets and loads the file contents

### JSON Payload Format

Assets are grouped by category under an `assets` object. Each key is a category name and the value is an array of assets belonging to that category.

```json
{
  "version": 2,
  "exportedAt": "2026-05-21T10:00:00.000Z",
  "assets": {
    "us-stocks": [
      {
        "id": "unique-string-id",
        "category": "us-stocks",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "avgCost": 150.00,
        "units": 10,
        "goalPrice": 200.00,
        "priceCurrency": "USD"
      }
    ]
  }
}
```

Only include categories that have assets — empty categories can be omitted.

#### Required fields per asset

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (any string; use a UUID or timestamp) |
| `category` | `string` | Must match the parent category key |
| `ticker` | `string` | Ticker symbol, fund code, or any label |
| `name` | `string` | Display name |
| `avgCost` | `number` | Average purchase price per unit (in `priceCurrency`) |
| `units` | `number` | Number of units / shares held |
| `goalPrice` | `number` | Target price (in `priceCurrency`); use `0` if none |
| `priceCurrency` | `"THB"` \| `"USD"` | Currency of `avgCost` and `goalPrice` |

#### Optional fields per asset

| Field | Type | Description |
|---|---|---|
| `coinGeckoId` | `string` | CoinGecko coin ID (crypto only, e.g. `"bitcoin"`) |
| `manualPrice` | `number` | Override API price with a fixed value |
| `lastPriceFetched` | `number` | Last known market price (pre-fills display before next fetch) |
| `lastUpdated` | `string` | ISO 8601 timestamp of the last price update |

#### Valid category keys

| Key | Page |
|---|---|
| `"us-stocks"` | US Stocks |
| `"etf"` | ETFs |
| `"thai-mutual-funds"` | Thai Mutual Funds |
| `"thai-stocks-drs"` | Thai Stocks & DRs |
| `"emergency-cash"` | Emergency Cash |
| `"gold"` | Gold |
| `"crypto"` | Cryptocurrency |

#### Full example with one asset per category

```json
{
  "version": 2,
  "exportedAt": "2026-05-21T10:00:00.000Z",
  "assets": {
    "us-stocks": [
      {
        "id": "1",
        "category": "us-stocks",
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "avgCost": 150.00,
        "units": 10,
        "goalPrice": 220.00,
        "priceCurrency": "USD"
      }
    ],
    "etf": [
      {
        "id": "2",
        "category": "etf",
        "ticker": "VOO",
        "name": "Vanguard S&P 500 ETF",
        "avgCost": 420.00,
        "units": 5,
        "goalPrice": 500.00,
        "priceCurrency": "USD"
      }
    ],
    "thai-stocks-drs": [
      {
        "id": "3",
        "category": "thai-stocks-drs",
        "ticker": "PTT.BK",
        "name": "PTT PCL",
        "avgCost": 35.50,
        "units": 1000,
        "goalPrice": 45.00,
        "priceCurrency": "THB"
      }
    ],
    "thai-mutual-funds": [
      {
        "id": "4",
        "category": "thai-mutual-funds",
        "ticker": "KFLTFDIV-A",
        "name": "KF LTF Dividend",
        "avgCost": 12.50,
        "units": 10000,
        "goalPrice": 15.00,
        "priceCurrency": "THB",
        "manualPrice": 13.20
      }
    ],
    "crypto": [
      {
        "id": "5",
        "category": "crypto",
        "ticker": "BTC",
        "name": "Bitcoin",
        "avgCost": 40000.00,
        "units": 0.5,
        "goalPrice": 100000.00,
        "priceCurrency": "USD",
        "coinGeckoId": "bitcoin"
      }
    ],
    "gold": [
      {
        "id": "6",
        "category": "gold",
        "ticker": "GC=F",
        "name": "Gold Futures",
        "avgCost": 1900.00,
        "units": 2,
        "goalPrice": 2500.00,
        "priceCurrency": "USD"
      }
    ],
    "emergency-cash": [
      {
        "id": "7",
        "category": "emergency-cash",
        "ticker": "SAVINGS",
        "name": "Emergency Fund",
        "avgCost": 1,
        "units": 300000,
        "goalPrice": 1,
        "priceCurrency": "THB",
        "manualPrice": 1
      }
    ]
  }
}
```

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
│   ├── ui/                    # shadcn/ui-style components
│   ├── AssetForm.tsx          # Add/edit asset dialog
│   ├── AssetIcon.tsx          # Icons for each asset
│   ├── AssetTable.tsx         # Holdings table
│   ├── CategoryChart.tsx      # Pie + bar charts
│   ├── Header.tsx             # Top bar (currency toggle, import/export)
│   ├── ImportExportDialog.tsx # Import / Export modal
│   └── Sidebar.tsx            # Navigation
├── pages/
│   ├── CategoryPage.tsx       # Reusable page for all 7 categories
│   └── Summary.tsx            # Portfolio overview
├── services/
│   ├── exchangeRate.ts        # open.er-api.com integration
│   └── marketData.ts         # Yahoo Finance + CoinGecko
├── store/
│   └── portfolioStore.ts     # Zustand store (persisted)
├── types/index.ts
└── utils/
    ├── calculations.ts
    ├── dataIO.ts              # JSON export/import helpers
    └── formatters.ts
```

## Build for Production

```bash
npm run build
npm run preview
```

The built output in `dist/` is a static site you can open directly with a browser (uses hash-based routing).

> **Note:** The Yahoo Finance proxy only runs during `npm run dev`. For production, a server-side proxy is required to forward requests to Yahoo Finance (CORS blocks direct browser access).
