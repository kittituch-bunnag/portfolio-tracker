import { useState } from 'react'
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

// Parqet logo CDN — free, no auth, covers 100k+ stock/ETF tickers by symbol
function ParqetLogo({
  ticker,
  size,
  className,
  fallback,
}: {
  ticker: string
  size: number
  className: string
  fallback: React.ReactNode
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return <>{fallback}</>
  return (
    <img
      src={`https://assets.parqet.com/logos/symbol/${ticker.toUpperCase()}`}
      alt={ticker}
      style={{ width: size, height: size }}
      className={`rounded-md object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  )
}

export function AssetIcon({ ticker, category, coinGeckoId, size = 28, className = '' }: AssetIconProps) {
  const style = { width: size, height: size }
  const emoji = CATEGORY_EMOJI[category] ?? '💼'
  const emojiEl = (
    <span
      style={style}
      className={`inline-flex items-center justify-center rounded-full bg-muted text-base ${className}`}
    >
      {emoji}
    </span>
  )

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

  // US stocks / ETFs: Parqet logo CDN covers virtually all tickers, falls back to emoji
  if (category === 'us-stocks' || category === 'etf') {
    return <ParqetLogo ticker={ticker} size={size} className={className} fallback={emojiEl} />
  }

  // Thai stocks & DRs: Parqet supports SET tickers with .BK suffix (e.g. PTT.BK).
  // DR tickers are formatted as AAPL-R.BK — strip "-R.BK" to get the underlying symbol.
  if (category === 'thai-stocks-drs') {
    const upper = ticker.toUpperCase()
    const parqetTicker = upper.endsWith('-R.BK') ? upper.replace(/-R\.BK$/, '') : upper
    return <ParqetLogo ticker={parqetTicker} size={size} className={className} fallback={emojiEl} />
  }

  return emojiEl
}
