import { useState, useEffect, useCallback } from 'react'
import { Plus, Info } from 'lucide-react'
import { AssetCategory, Asset, AssetWithMarketData } from '@/types'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fetchPricesForAssets } from '@/services/marketData'
import { calcAsset } from '@/utils/calculations'
import { AssetTable } from '@/components/AssetTable'
import { AssetForm } from '@/components/AssetForm'
import { AllocationChart, PnlBarChart } from '@/components/CategoryChart'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { convertCurrency } from '@/utils/calculations'
import { cn } from '@/lib/utils'

const CATEGORY_INFO: Record<AssetCategory, { title: string; description: string; dataNote?: string }> = {
  'us-stocks': {
    title: 'US Stocks',
    description: 'NYSE & NASDAQ listed equities',
    dataNote: 'Prices via Yahoo Finance. Use standard ticker symbols (AAPL, MSFT, NVDA…).',
  },
  'etf': {
    title: 'ETFs',
    description: 'Exchange-Traded Funds — US & international',
    dataNote: 'Prices via Yahoo Finance. Use ETF tickers (SPY, QQQ, VTI, SPDR.BK…).',
  },
  'thai-mutual-funds': {
    title: 'Thai Mutual Funds',
    description: 'กองทุนรวมไทย — Thai registered funds',
    dataNote:
      "NAVs are fetched automatically from Finnomena. Search for a fund by name or ticker when adding it — the fund ID is set automatically. Use Manual Price Override only if a fund isn't found.",
  },
  'thai-stocks-drs': {
    title: 'Thai Stocks & DRs',
    description: 'SET/mai-listed stocks and Depositary Receipts',
    dataNote:
      'Append .BK to SET tickers (PTT.BK, CPALL.BK). For DRs use the DR ticker (e.g. AAPL-R.BK).',
  },
  'emergency-cash': {
    title: 'Emergency Funds & Cash',
    description: 'Savings accounts, fixed deposits, cash holdings',
    dataNote:
      'No live pricing. Enter the current balance as Manual Price Override with 1 unit, or enter amount as avgCost × units.',
  },
  'gold': {
    title: 'Gold',
    description: 'Physical gold, gold ETFs, gold futures',
    dataNote:
      'Use GC=F for gold futures (USD/troy oz), GLD for SPDR Gold ETF, or SPDR.BK for the Thai-listed gold ETF. For Thai gold bar price in THB/baht-weight, set currency to THB and use a Manual Price Override.',
  },
  'crypto': {
    title: 'Cryptocurrency',
    description: 'Bitcoin, Ethereum and other digital assets',
    dataNote:
      'Prices via CoinGecko. Enter the ticker (BTC, ETH, SOL…) and the CoinGecko ID is auto-filled for common coins.',
  },
}

interface CategoryPageProps {
  category: AssetCategory
}

export function CategoryPage({ category }: CategoryPageProps) {
  const { assets, displayCurrency, usdToThb, addAsset, updateAsset, removeAsset } = usePortfolioStore()

  const categoryAssets = assets.filter((a) => a.category === category)
  const [prices, setPrices] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)

  const assetsWithData: AssetWithMarketData[] = categoryAssets.map((a) => {
    const price = prices.get(a.id) ?? a.lastPriceFetched ?? 0
    return calcAsset(a, price)
  })

  const refreshPrices = useCallback(async () => {
    if (categoryAssets.length === 0) return
    setLoading(true)
    try {
      const map = await fetchPricesForAssets(categoryAssets)
      setPrices(map)
      // Persist last fetched price
      map.forEach((price, id) => {
        updateAsset(id, { lastPriceFetched: price })
      })
    } finally {
      setLoading(false)
    }
  }, [categoryAssets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch on mount and when assets added
  useEffect(() => {
    refreshPrices()
  }, [categoryAssets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Restore persisted prices on mount
  useEffect(() => {
    const restored = new Map<string, number>()
    for (const a of categoryAssets) {
      if (a.lastPriceFetched) restored.set(a.id, a.lastPriceFetched)
    }
    setPrices((prev) => {
      const merged = new Map(restored)
      prev.forEach((v, k) => merged.set(k, v))
      return merged
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave(asset: Asset) {
    if (editAsset) updateAsset(asset.id, asset)
    else addAsset(asset)
    setEditAsset(null)
  }

  function handleEdit(asset: AssetWithMarketData) {
    setEditAsset(asset)
    setFormOpen(true)
  }

  function handleDelete(id: string) {
    if (confirm('Remove this asset?')) removeAsset(id)
  }

  const info = CATEGORY_INFO[category]

  // Summary stats
  const totalValue = assetsWithData.reduce(
    (s, a) => s + convertCurrency(a.currentValue, a.priceCurrency, displayCurrency, usdToThb),
    0
  )
  const totalCost = assetsWithData.reduce(
    (s, a) => s + convertCurrency(a.costBasis, a.priceCurrency, displayCurrency, usdToThb),
    0
  )
  const totalPnl = totalValue - totalCost
  const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{info.title}</h1>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        <Button
          onClick={() => {
            setEditAsset(null)
            setFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Asset
        </Button>
      </div>

      {/* Data source note */}
      {info.dataNote && (
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{info.dataNote}</span>
        </div>
      )}

      {/* Summary stats */}
      {categoryAssets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Value" value={formatCurrency(totalValue, displayCurrency)} />
          <StatCard label="Cost Basis" value={formatCurrency(totalCost, displayCurrency)} />
          <StatCard
            label="P&L"
            value={formatCurrency(totalPnl, displayCurrency)}
            positive={totalPnl >= 0}
          />
          <StatCard
            label="Return"
            value={formatPercent(pnlPct)}
            positive={pnlPct >= 0}
          />
        </div>
      )}

      {/* Table + Charts tabs */}
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <AssetTable
            assets={assetsWithData}
            displayCurrency={displayCurrency}
            usdToThb={usdToThb}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefreshPrices={refreshPrices}
          />
        </TabsContent>

        <TabsContent value="charts" className="mt-4">
          {assetsWithData.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              Add assets to see charts.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <AllocationChart
                    assets={assetsWithData}
                    displayCurrency={displayCurrency}
                    usdToThb={usdToThb}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <PnlBarChart
                    assets={assetsWithData}
                    displayCurrency={displayCurrency}
                    usdToThb={usdToThb}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AssetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialAsset={editAsset}
        defaultCategory={category}
        onSave={handleSave}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-lg font-semibold mt-0.5',
            positive === true && 'text-profit',
            positive === false && 'text-loss'
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
