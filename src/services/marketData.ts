import { Asset, MarketPrice } from '@/types'

// ---------------------------------------------------------------------------
// Yahoo Finance — US stocks, ETFs, Thai stocks (.BK), gold (GC=F), etc.
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
// CoinGecko — crypto prices in USD
// ---------------------------------------------------------------------------
async function fetchCoinGeckoRaw(coinIds: string[]): Promise<Record<string, Record<string, number>>> {
  if (coinIds.length === 0) return {}
  const ids = coinIds.join(',')
  const url = `/api/coingecko/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd,thb&include_24hr_change=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`)
  return res.json()
}

export async function fetchCoinGeckoPrices(coinIds: string[]): Promise<MarketPrice[]> {
  const data = await fetchCoinGeckoRaw(coinIds)
  return Object.entries(data).map(([id, prices]) => ({
    ticker: id,
    price: prices.usd ?? 0,
    currency: 'USD' as const,
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
// Finnomena public fund list — no auth required
// ---------------------------------------------------------------------------
export interface FinnomenaFund { fund_id: string; short_code: string; name_th: string }
let finnomenaFundCache: FinnomenaFund[] | null = null

export async function searchFinnomenaFund(query: string): Promise<FinnomenaFund[]> {
  if (!finnomenaFundCache) {
    const res = await fetch('/api/finnomena-public/fn3/api/fund/v2/public/funds')
    if (!res.ok) throw new Error('Finnomena fund list fetch failed')
    const data = await res.json()
    finnomenaFundCache = (data.data ?? []) as FinnomenaFund[]
  }
  const q = query.toLowerCase()
  return finnomenaFundCache
    .filter((f) => f.short_code.toLowerCase().includes(q) || f.name_th.toLowerCase().includes(q))
    .slice(0, 10)
}

// ---------------------------------------------------------------------------
// Finnomena — Thai mutual fund NAV (requires FINNOMENA_EMAIL + FINNOMENA_PASSWORD in .env.local)
// ---------------------------------------------------------------------------
export async function fetchFinnomenaNavPrices(assets: Asset[]): Promise<MarketPrice[]> {
  if (assets.length === 0) return []

  // Warm up the fund list cache so we can resolve short_code → fund_id.
  // NAV endpoint returns {} for short_codes; it requires fund_id.
  if (!finnomenaFundCache) {
    try {
      const res = await fetch('/api/finnomena-public/fn3/api/fund/v2/public/funds')
      if (res.ok) {
        const data = await res.json()
        finnomenaFundCache = (data.data ?? []) as FinnomenaFund[]
      }
    } catch { /* non-fatal — fall back to ticker below */ }
  }

  const results = await Promise.allSettled(
    assets.map(async (asset): Promise<MarketPrice | null> => {
      const fundId = asset.finnomenaFundId
        ?? finnomenaFundCache?.find((f) => f.short_code === asset.ticker)?.fund_id
      if (!fundId) {
        console.warn(`[finnomena] no fund_id for ${asset.ticker} — re-add via fund search to enable NAV`)
        return null
      }

      // Public v2 endpoint — no auth required, fund_id in path
      const url = `/api/finnomena-public/fn3/api/fund/v2/public/funds/${encodeURIComponent(fundId)}/latest`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(`Finnomena error ${res.status}`)

      const nav = data?.data?.value ?? null
      if (nav == null) {
        console.warn(`[finnomena] no NAV for ${asset.ticker} (${fundId}) — raw:`, JSON.stringify(data).slice(0, 200))
        return null
      }

      return {
        ticker: asset.ticker,
        price: Number(nav),
        currency: 'THB',
        change24h: undefined,
        changePercent24h: data?.data?.d_change != null ? Number(data.data.d_change) : undefined,
      }
    }),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<MarketPrice | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is MarketPrice => v !== null)
}

// ---------------------------------------------------------------------------
// Batch fetch — routes each asset to the right price source
// ---------------------------------------------------------------------------
export async function fetchPricesForAssets(assets: Asset[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()

  const manualAssets = assets.filter((a) => a.manualPrice != null)
  const yahooAssets = assets.filter(
    (a) => a.category !== 'crypto' &&
           a.category !== 'emergency-cash' &&
           a.category !== 'thai-mutual-funds' &&
           !a.manualPrice,
  )
  const finnomenaAssets = assets.filter((a) => a.category === 'thai-mutual-funds' && !a.manualPrice)
  const cryptoAssets = assets.filter((a) => a.category === 'crypto' && !a.manualPrice)

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

  // Finnomena (Thai mutual funds)
  if (finnomenaAssets.length > 0) {
    try {
      const prices = await fetchFinnomenaNavPrices(finnomenaAssets)
      for (const asset of finnomenaAssets) {
        const match = prices.find((p) => p.ticker.toUpperCase() === asset.ticker.toUpperCase())
        if (match) priceMap.set(asset.id, match.price)
      }
    } catch (e) {
      console.warn('Finnomena fetch failed:', e)
    }
  }

  // CoinGecko
  if (cryptoAssets.length > 0) {
    try {
      const ids = cryptoAssets.filter((a) => a.coinGeckoId).map((a) => a.coinGeckoId!)
      if (ids.length > 0) {
        const raw = await fetchCoinGeckoRaw(ids)
        for (const asset of cryptoAssets) {
          if (!asset.coinGeckoId) continue
          const prices = raw[asset.coinGeckoId]
          if (!prices) continue
          const price = asset.priceCurrency === 'THB' ? (prices.thb ?? 0) : (prices.usd ?? 0)
          priceMap.set(asset.id, price)
        }
      }
    } catch (e) {
      console.warn('CoinGecko fetch failed:', e)
    }
  }

  return priceMap
}
