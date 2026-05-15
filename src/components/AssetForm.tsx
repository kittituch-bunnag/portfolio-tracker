import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Asset, AssetCategory, AssetCurrency } from '@/types'
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

const EMPTY: Partial<Asset> = {
  ticker: '',
  name: '',
  avgCost: 0,
  units: 0,
  goalPrice: 0,
  manualPrice: undefined,
  coinGeckoId: undefined,
}

export function AssetForm({ open, onOpenChange, initialAsset, defaultCategory, onSave }: AssetFormProps) {
  const [category, setCategory] = useState<AssetCategory>(defaultCategory ?? 'us-stocks')
  const [priceCurrency, setPriceCurrency] = useState<AssetCurrency>('USD')
  const [form, setForm] = useState<typeof EMPTY>(EMPTY)

  useEffect(() => {
    if (open) {
      if (initialAsset) {
        setCategory(initialAsset.category)
        setPriceCurrency(initialAsset.priceCurrency)
        setForm({
          ticker: initialAsset.ticker,
          name: initialAsset.name,
          avgCost: initialAsset.avgCost,
          units: initialAsset.units,
          goalPrice: initialAsset.goalPrice,
          manualPrice: initialAsset.manualPrice,
          coinGeckoId: initialAsset.coinGeckoId,
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
    const asset: Asset = {
      id: initialAsset?.id ?? uuidv4(),
      category,
      ticker: (form.ticker ?? '').trim().toUpperCase(),
      name: (form.name ?? '').trim(),
      avgCost: Number(form.avgCost) || 0,
      units: Number(form.units) || 0,
      goalPrice: Number(form.goalPrice) || 0,
      priceCurrency,
      manualPrice: form.manualPrice ? Number(form.manualPrice) : undefined,
      coinGeckoId: category === 'crypto' ? (form.coinGeckoId || CRYPTO_COINGECKO_MAP[(form.ticker ?? '').toUpperCase()]) : undefined,
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
          <div className="space-y-1.5">
            <Label>Ticker / Code</Label>
            <Input
              placeholder={CATEGORY_TICKER_HINT[category]}
              value={form.ticker ?? ''}
              onChange={(e) => set('ticker', e.target.value)}
              onBlur={handleTickerBlur}
              required
            />
          </div>

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

          {/* Avg Cost + Units row */}
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

          {/* Goal Price */}
          <div className="space-y-1.5">
            <Label>Goal Price ({priceCurrency})</Label>
            <Input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={form.goalPrice ?? ''}
              onChange={(e) => set('goalPrice', e.target.value)}
            />
          </div>

          {/* Manual Price Override */}
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
