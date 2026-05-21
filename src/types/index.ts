export type AssetCategory =
  | 'us-stocks'
  | 'etf'
  | 'thai-mutual-funds'
  | 'thai-stocks-drs'
  | 'emergency-cash'
  | 'gold'
  | 'crypto'

export type DisplayCurrency = 'THB' | 'USD'
export type AssetCurrency = 'THB' | 'USD'
export type PriceSource = 'yahoo' | 'coingecko' | 'manual'

export interface Asset {
  id: string
  category: AssetCategory
  ticker: string         // ticker symbol, fund code, or identifier
  name: string
  avgCost: number        // average purchase price per unit (in priceCurrency)
  units: number
  buyGoalPrice?: number  // target price to buy more (in priceCurrency)
  sellGoalPrice?: number // target price to sell / take profit (in priceCurrency)
  priceCurrency: AssetCurrency
  coinGeckoId?: string       // for crypto assets
  finnomenaFundId?: string   // for Thai mutual funds (fund_id from Finnomena)
  manualPrice?: number   // override API price
  lastPriceFetched?: number
  lastUpdated?: string
}

export interface MarketPrice {
  ticker: string
  price: number
  currency: AssetCurrency
  change24h?: number
  changePercent24h?: number
}

export interface AssetWithMarketData extends Asset {
  currentPrice: number
  costBasis: number
  currentValue: number
  pnlValue: number
  pnlPercent: number
  toBuyGoalPercent: number
  toSellGoalPercent: number
}

export interface CategorySummary {
  category: AssetCategory
  totalValue: number       // in display currency
  totalCost: number
  totalPnl: number
  pnlPercent: number
  assetCount: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalPnl: number
  pnlPercent: number
  categories: CategorySummary[]
}
