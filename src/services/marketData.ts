import { Asset, MarketPrice } from '@/types'

// ---------------------------------------------------------------------------
// Yahoo Finance — covers US stocks, ETFs, Thai stocks (.BK), gold (GC=F), etc.
// ---------------------------------------------------------------------------
export async function fetchYahooPrices(tickers: string[]): Promise<MarketPrice[]> {
  if (tickers.length === 0) return []
  const symbols = tickers.join(',')
  const url = `/api/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,currency`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(`Yahoo Finance error: ${res.status} — ${data?.error ?? JSON.stringify(data)}`)
  const quotes: Array<Record<string, unknown>> = data?.quoteResponse?.result ?? []

  return quotes.map((q) => ({
    ticker: String(q.symbol ?? ''),
    price: Number(q.regularMarketPrice ?? 0),
    currency: String(q.currency ?? 'USD') === 'THB' ? 'THB' : 'USD',
    change24h: Number(q.regularMarketChange ?? 0),
    changePercent24h: Number(q.regularMarketChangePercent ?? 0),
  }))
}

// ---------------------------------------------------------------------------
// CoinGecko — crypto prices in both USD and THB
// ---------------------------------------------------------------------------
export async function fetchCoinGeckoPrices(coinIds: string[]): Promise<MarketPrice[]> {
  if (coinIds.length === 0) return []
  const ids = coinIds.join(',')
  const url = `/api/coingecko/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd,thb&include_24hr_change=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
  const data: Record<string, Record<string, number>> = await res.json()

  return Object.entries(data).map(([id, prices]) => ({
    ticker: id,
    price: prices.usd ?? 0,
    currency: 'USD',
    change24h: undefined,
    changePercent24h: prices.usd_24h_change ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Search CoinGecko for coin ID by symbol
// ---------------------------------------------------------------------------
let coinListCache: Array<{ id: string; symbol: string; name: string }> | null = null

export async function searchCoinGeckoId(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
  if (!coinListCache) {
    const res = await fetch('/api/coingecko/api/v3/coins/list')
    if (!res.ok) throw new Error('CoinGecko coin list fetch failed')
    coinListCache = await res.json()
  }
  const q = query.toLowerCase()
  return (coinListCache ?? [])
    .filter((c) => c.symbol === q || c.name.toLowerCase().includes(q))
    .slice(0, 20)
}

// ---------------------------------------------------------------------------
// Batch fetch for all assets in a category
// ---------------------------------------------------------------------------
export async function fetchPricesForAssets(assets: Asset[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()

  // Group by source
  const yahooAssets = assets.filter(
    (a) => !['crypto'].includes(a.category) && a.category !== 'emergency-cash' && !a.manualPrice
  )
  const cryptoAssets = assets.filter((a) => a.category === 'crypto' && !a.manualPrice)
  const manualAssets = assets.filter((a) => a.manualPrice != null)

  // Manual overrides
  for (const asset of manualAssets) {
    priceMap.set(asset.id, asset.manualPrice!)
  }

  // Yahoo Finance
  if (yahooAssets.length > 0) {
    try {
      const tickers = yahooAssets.map((a) => a.ticker)
      const prices = await fetchYahooPrices(tickers)
      for (const asset of yahooAssets) {
        const match = prices.find((p) => p.ticker.toUpperCase() === asset.ticker.toUpperCase())
        if (match) priceMap.set(asset.id, match.price)
      }
    } catch (e) {
      console.warn('Yahoo Finance fetch failed:', e)
    }
  }

  // CoinGecko
  if (cryptoAssets.length > 0) {
    try {
      const ids = cryptoAssets.filter((a) => a.coinGeckoId).map((a) => a.coinGeckoId!)
      if (ids.length > 0) {
        const prices = await fetchCoinGeckoPrices(ids)
        for (const asset of cryptoAssets) {
          if (!asset.coinGeckoId) continue
          const match = prices.find((p) => p.ticker === asset.coinGeckoId)
          if (match) priceMap.set(asset.id, match.price)
        }
      }
    } catch (e) {
      console.warn('CoinGecko fetch failed:', e)
    }
  }

  return priceMap
}
