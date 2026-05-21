import { AssetCategory } from '@/types'

const CATEGORY_EMOJI: Record<AssetCategory, string> = {
  'us-stocks': '🇺🇸',
  'etf': '📦',
  'thai-mutual-funds': '🇹🇭',
  'thai-stocks-drs': '📊',
  'emergency-cash': '💵',
  'gold': '🥇',
  'crypto': '₿',
}

// Map of well-known tickers → Clearbit logo domain
const TICKER_DOMAIN: Record<string, string> = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  NVDA: 'nvidia.com',
  TSLA: 'tesla.com',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  INTC: 'intel.com',
  CRM: 'salesforce.com',
  ORCL: 'oracle.com',
  ADBE: 'adobe.com',
  PYPL: 'paypal.com',
  V: 'visa.com',
  MA: 'mastercard.com',
  JPM: 'jpmorganchase.com',
  BAC: 'bankofamerica.com',
  GS: 'goldmansachs.com',
  SPY: 'ssga.com',
  QQQ: 'invesco.com',
  VTI: 'vanguard.com',
  VOO: 'vanguard.com',
  GLD: 'spdrgoldshares.com',
  BTC: 'bitcoin.org',
}

// CoinGecko image cache
const COINGECKO_IMAGES: Record<string, string> = {
  bitcoin: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ethereum: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  binancecoin: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  solana: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  ripple: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  cardano: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  dogecoin: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  polkadot: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  'matic-network': 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  'shiba-inu': 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
}

interface AssetIconProps {
  ticker: string
  category: AssetCategory
  coinGeckoId?: string
  size?: number
  className?: string
}

export function AssetIcon({ ticker, category, coinGeckoId, size = 28, className = '' }: AssetIconProps) {
  const style = { width: size, height: size }

  // Crypto: CoinGecko image
  if (category === 'crypto' && coinGeckoId && COINGECKO_IMAGES[coinGeckoId]) {
    return (
      <img
        src={COINGECKO_IMAGES[coinGeckoId]}
        alt={ticker}
        style={style}
        className={`rounded-full object-contain ${className}`}
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }

  // US stocks / ETFs: Google favicon service
  const domain = TICKER_DOMAIN[ticker.toUpperCase()]
  if (domain && (category === 'us-stocks' || category === 'etf')) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={ticker}
        style={style}
        className={`rounded-md object-contain ${className}`}
        onError={(e) => {
          const el = e.target as HTMLImageElement
          el.style.display = 'none'
          const parent = el.parentElement
          if (parent) parent.dataset.fallback = 'true'
        }}
      />
    )
  }

  // Fallback: category emoji in a colored circle
  const emoji = CATEGORY_EMOJI[category] ?? '💼'
  return (
    <span
      style={style}
      className={`inline-flex items-center justify-center rounded-full bg-muted text-base ${className}`}
    >
      {emoji}
    </span>
  )
}
