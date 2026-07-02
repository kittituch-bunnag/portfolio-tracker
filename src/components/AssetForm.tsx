import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Asset, AssetCategory, AssetCurrency } from '@/types'
import { searchFinnomenaFund, FinnomenaFund } from '@/services/marketData'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  'us-stocks': 'US Stocks',
  'etf': 'ETFs',
  'thai-mutual-funds': 'Thai Mutual Funds',
  'thai-stocks-drs': 'Thai Stocks & DRs',
  'emergency-cash': 'Emergency Funds & Cash',
  'gold': 'Gold',
  'crypto': 'Cryptocurrency',
}

const CATEGORY_CURRENCY_DEFAULT: Record<AssetCategory, AssetCurrency> = {
  'us-stocks': 'USD',
  'etf': 'USD',
  'thai-mutual-funds': 'THB',
  'thai-stocks-drs': 'THB',
  'emergency-cash': 'THB',
  'gold': 'USD',
  'crypto': 'USD',
}

const CATEGORY_TICKER_HINT: Record<AssetCategory, string> = {
  'us-stocks': 'e.g. AAPL, MSFT, NVDA',
  'etf': 'e.g. SPY, QQQ, VTI',
  'thai-mutual-funds': 'e.g. KFLTFDIV-A, SCBDV (fund code)',
  'thai-stocks-drs': 'e.g. PTT.BK, CPALL.BK, AAPL-R.BK',
  'emergency-cash': 'e.g. SCB Savings, Cash THB',
  'gold': 'e.g. GC=F (futures), GLD (ETF), SPDR.BK',
  'crypto': 'e.g. BTC, ETH, SOL',
}

const CRYPTO_COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  SHIB: 'shiba-inu',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  ATOM: 'cosmos',
  XLM: 'stellar',
  ALGO: 'algorand',
  VET: 'vechain',
  FIL: 'filecoin',
}

interface AssetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAsset?: Asset | null
  defaultCategory?: AssetCategory
  onSave: (asset: Asset) => void
}

const EMPTY: Partial<Asset> & { cryptoCostBasis?: number } = {
  ticker: '',
  name: '',
  avgCost: 0,
  units: 0,
  cryptoCostBasis: undefined,
  buyGoalPrice: undefined,
  sellGoalPrice: undefined,
  manualPrice: undefined,
  coinGeckoId: undefined,
  finnomenaFundId: undefined,
}

export function AssetForm({ open, onOpenChange, initialAsset, defaultCategory, onSave }: AssetFormProps) {
  const [category, setCategory] = useState<AssetCategory>(defaultCategory ?? 'us-stocks')
  const [priceCurrency, setPriceCurrency] = useState<AssetCurrency>('USD')
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)

  // Derived avg price preview for crypto (costBasis / units)
  const cryptoAvgPrice: number | null = (() => {
    if (category !== 'crypto') return null
    const cb = Number(form.cryptoCostBasis)
    const u = Number(form.units)
    if (!cb || !u) return null
    return cb / u
  })()
  const [fundSuggestions, setFundSuggestions] = useState<FinnomenaFund[]>([])
  const [fundDropdownOpen, setFundDropdownOpen] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialAsset) {
        setCategory(initialAsset.category)
        setPriceCurrency(initialAsset.priceCurrency)
        setForm({
          ticker: initialAsset.ticker,
          name: initialAsset.name,
          avgCost: initialAsset.category === 'emergency-cash'
            ? initialAsset.avgCost * initialAsset.units
            : initialAsset.avgCost,
          units: initialAsset.units,
          cryptoCostBasis: initialAsset.category === 'crypto'
            ? initialAsset.avgCost * initialAsset.units
            : undefined,
          buyGoalPrice: initialAsset.buyGoalPrice,
          sellGoalPrice: initialAsset.sellGoalPrice,
          manualPrice: initialAsset.manualPrice,
          coinGeckoId: initialAsset.coinGeckoId,
          finnomenaFundId: initialAsset.finnomenaFundId,
        })
      } else {
        const cat = defaultCategory ?? 'us-stocks'
        setCategory(cat)
        setPriceCurrency(CATEGORY_CURRENCY_DEFAULT[cat])
        setForm(EMPTY)
      }
    }
  }, [open, initialAsset, defaultCategory])

  function handleCategoryChange(cat: AssetCategory) {
    setCategory(cat)
    setPriceCurrency(CATEGORY_CURRENCY_DEFAULT[cat])
    setFundDropdownOpen(false)
    setFundSuggestions([])
  }

  async function handleTickerChange(value: string) {
    set('ticker', value)
    if (category === 'thai-mutual-funds' && value.length >= 2) {
      try {
        const results = await searchFinnomenaFund(value)
        setFundSuggestions(results)
        setFundDropdownOpen(results.length > 0)
      } catch {
        setFundDropdownOpen(false)
      }
    } else {
      setFundDropdownOpen(false)
    }
  }

  function handleFundSelect(fund: FinnomenaFund) {
    setForm((f) => ({
      ...f,
      ticker: fund.short_code,
      name: f.name || fund.name_th,
      finnomenaFundId: fund.fund_id,
    }))
    setFundDropdownOpen(false)
  }

  function handleTickerBlur() {
    // Auto-set CoinGecko ID for known crypto tickers
    if (category === 'crypto' && form.ticker) {
      const cgId = CRYPTO_COINGECKO_MAP[form.ticker.toUpperCase()]
      if (cgId) setForm((f) => ({ ...f, coinGeckoId: cgId }))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = (form.name ?? '').trim()

    if (category === 'emergency-cash') {
      const amount = Number(form.avgCost) || 0
      const asset: Asset = {
        id: initialAsset?.id ?? uuidv4(),
        category,
        ticker: name.toUpperCase(),
        name,
        avgCost: amount,
        units: 1,
        priceCurrency,
        manualPrice: amount,
        lastUpdated: new Date().toISOString(),
      }
      onSave(asset)
      onOpenChange(false)
      return
    }

    const units = Number(form.units) || 0
    const avgCost = category === 'crypto'
      ? (units > 0 ? (Number(form.cryptoCostBasis) || 0) / units : 0)
      : Number(form.avgCost) || 0
    const asset: Asset = {
      id: initialAsset?.id ?? uuidv4(),
      category,
      ticker: (form.ticker ?? '').trim().toUpperCase(),
      name,
      avgCost,
      units,
      buyGoalPrice: form.buyGoalPrice != null ? Number(form.buyGoalPrice) : undefined,
      sellGoalPrice: form.sellGoalPrice ? Number(form.sellGoalPrice) : undefined,
      priceCurrency,
      manualPrice: form.manualPrice ? Number(form.manualPrice) : undefined,
      coinGeckoId: category === 'crypto' ? (form.coinGeckoId || CRYPTO_COINGECKO_MAP[(form.ticker ?? '').toUpperCase()]) : undefined,
      finnomenaFundId: category === 'thai-mutual-funds' ? form.finnomenaFundId : undefined,
      lastUpdated: new Date().toISOString(),
    }
    onSave(asset)
    onOpenChange(false)
  }

  function set(key: keyof typeof EMPTY, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const isEdit = !!initialAsset

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0">
        <div className="max-h-[90vh] overflow-y-auto px-6 py-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Asset' : 'Add Asset'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update your holding details.' : 'Enter your holding details below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label>Asset Type</Label>
            <NativeSelect
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as AssetCategory[]).map((k) => (
                <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
              ))}
            </NativeSelect>
          </div>

          {/* Ticker */}
          {category !== 'emergency-cash' && (
          <div className="space-y-1.5">
            <Label>Ticker / Code</Label>
            <div>
              <Input
                placeholder={CATEGORY_TICKER_HINT[category]}
                value={form.ticker ?? ''}
                onChange={(e) => handleTickerChange(e.target.value)}
                onBlur={handleTickerBlur}
                autoComplete="off"
                required
              />
            </div>
            {fundDropdownOpen && (
              <ul className="w-full max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-sm text-sm">
                {fundSuggestions.map((fund) => (
                  <li key={fund.fund_id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                      onMouseDown={(e) => { e.preventDefault(); handleFundSelect(fund) }}
                    >
                      <span className="font-medium">{fund.short_code}</span>
                      <span className="ml-2 text-muted-foreground">{fund.name_th}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Asset full name"
              value={form.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>

          {/* Price Currency */}
          <div className="space-y-1.5">
            <Label>Price Currency</Label>
            <NativeSelect
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value as AssetCurrency)}
            >
              <option value="USD">USD — US Dollar</option>
              <option value="THB">THB — Thai Baht</option>
            </NativeSelect>
          </div>

          {/* Cost / Units row */}
          {category === 'emergency-cash' ? (
            <div className="space-y-1.5">
              <Label>Amount ({priceCurrency})</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={form.avgCost ?? ''}
                onChange={(e) => set('avgCost', e.target.value)}
                required
              />
            </div>
          ) : category === 'crypto' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cost Basis ({priceCurrency})</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={form.cryptoCostBasis ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cryptoCostBasis: e.target.value ? Number(e.target.value) : undefined }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Units / Coins</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={form.units ?? ''}
                    onChange={(e) => set('units', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Avg. Price ({priceCurrency})</Label>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={cryptoAvgPrice != null ? cryptoAvgPrice.toFixed(8).replace(/\.?0+$/, '') : '—'}
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Avg. Cost ({priceCurrency})</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={form.avgCost ?? ''}
                  onChange={(e) => set('avgCost', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Units / Shares</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  value={form.units ?? ''}
                  onChange={(e) => set('units', e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Goal Prices */}
          {category !== 'emergency-cash' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Buy Goal ({priceCurrency})</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="optional"
                value={form.buyGoalPrice ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, buyGoalPrice: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sell Goal ({priceCurrency})</Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="optional"
                value={form.sellGoalPrice ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sellGoalPrice: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </div>
          </div>
          )}

          {/* Manual Price Override */}
          {category !== 'emergency-cash' && (
          <div className="space-y-1.5">
            <Label>
              Manual Price Override{' '}
              <span className="text-muted-foreground font-normal">(optional — overrides API)</span>
            </Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="Leave blank to use live price"
              value={form.manualPrice ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, manualPrice: e.target.value ? Number(e.target.value) : undefined }))
              }
            />
          </div>
          )}

          {/* CoinGecko ID for crypto */}
          {category === 'crypto' && (
            <div className="space-y-1.5">
              <Label>
                CoinGecko ID{' '}
                <span className="text-muted-foreground font-normal">(auto-filled for common coins)</span>
              </Label>
              <Input
                placeholder="e.g. bitcoin, ethereum, solana"
                value={form.coinGeckoId ?? ''}
                onChange={(e) => set('coinGeckoId', e.target.value.toLowerCase())}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isEdit ? 'Save Changes' : 'Add Asset'}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NativeSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'dark:bg-background',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
