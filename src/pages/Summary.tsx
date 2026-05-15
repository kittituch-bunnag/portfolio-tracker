import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { AssetCategory } from '@/types'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fetchPricesForAssets } from '@/services/marketData'
import { calcAsset, buildPortfolioSummary } from '@/utils/calculations'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  'us-stocks': 'US Stocks',
  'etf': 'ETFs',
  'thai-mutual-funds': 'Thai Mutual Funds',
  'thai-stocks-drs': 'Thai Stocks & DRs',
  'emergency-cash': 'Cash & Emergency',
  'gold': 'Gold',
  'crypto': 'Crypto',
}

const CATEGORY_ROUTE: Record<AssetCategory, string> = {
  'us-stocks': '/us-stocks',
  'etf': '/etfs',
  'thai-mutual-funds': '/thai-mutual-funds',
  'thai-stocks-drs': '/thai-stocks-drs',
  'emergency-cash': '/emergency-cash',
  'gold': '/gold',
  'crypto': '/crypto',
}

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f59e0b','#f97316']

export function Summary() {
  const { assets, displayCurrency, usdToThb } = usePortfolioStore()
  const navigate = useNavigate()
  const [prices, setPrices] = useState<Map<string, number>>(new Map())

  // Restore cached prices from assets
  useEffect(() => {
    const restored = new Map<string, number>()
    for (const a of assets) {
      if (a.lastPriceFetched) restored.set(a.id, a.lastPriceFetched)
    }
    setPrices(restored)
  }, [assets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Background refresh
  useEffect(() => {
    if (assets.length === 0) return
    fetchPricesForAssets(assets).then(setPrices).catch(() => {})
  }, [assets.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const assetsWithData = assets.map((a) => calcAsset(a, prices.get(a.id) ?? a.lastPriceFetched ?? 0))
  const summary = buildPortfolioSummary(assetsWithData, displayCurrency, usdToThb)

  const pieData = summary.categories
    .filter((c) => c.totalValue > 0)
    .map((c) => ({ name: CATEGORY_LABELS[c.category], value: c.totalValue, category: c.category }))

  const barData = summary.categories
    .filter((c) => c.totalCost > 0)
    .map((c) => ({
      name: CATEGORY_LABELS[c.category],
      value: c.totalValue,
      cost: c.totalCost,
      pnl: c.totalPnl,
      pnlPct: c.pnlPercent,
    }))
    .sort((a, b) => b.value - a.value)

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <TrendingUp className="h-14 w-14 text-muted-foreground/50" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">No assets yet</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Pick a category from the sidebar and add your first holding.
          </p>
        </div>
      </div>
    )
  }

  const isPnlPos = summary.totalPnl >= 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio Summary</h1>
        <p className="text-sm text-muted-foreground">All assets in {displayCurrency}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Value" value={formatCurrency(summary.totalValue, displayCurrency, true)} />
        <KpiCard label="Total Cost" value={formatCurrency(summary.totalCost, displayCurrency, true)} />
        <KpiCard
          label="Total P&L"
          value={formatCurrency(summary.totalPnl, displayCurrency, true)}
          trend={isPnlPos ? 'up' : 'down'}
        />
        <KpiCard
          label="Overall Return"
          value={formatPercent(summary.pnlPercent)}
          trend={isPnlPos ? 'up' : 'down'}
        />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Allocation by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(v: number) => [
                    formatCurrency(v, displayCurrency),
                    `${((v / summary.totalValue) * 100).toFixed(1)}%`,
                  ]}
                />
                <Legend formatter={(v) => <span className="text-xs">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Value vs. Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, displayCurrency, true)} />
                <RTooltip
                  formatter={(v: number, name: string) => [
                    formatCurrency(v, displayCurrency),
                    name === 'value' ? 'Mkt. Value' : 'Cost Basis',
                  ]}
                />
                <Legend />
                <Bar dataKey="cost" name="Cost Basis" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="value" name="Mkt. Value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {['Category', 'Assets', 'Mkt. Value', 'Cost Basis', 'P&L', 'Return', 'Allocation'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.categories
                  .filter((c) => c.assetCount > 0)
                  .sort((a, b) => b.totalValue - a.totalValue)
                  .map((c) => {
                    const alloc = summary.totalValue > 0 ? (c.totalValue / summary.totalValue) * 100 : 0
                    const pos = c.totalPnl >= 0
                    return (
                      <tr
                        key={c.category}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(CATEGORY_ROUTE[c.category])}
                      >
                        <td className="px-4 py-3 pl-6 font-medium">{CATEGORY_LABELS[c.category]}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.assetCount}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(c.totalValue, displayCurrency)}</td>
                        <td className="px-4 py-3 font-mono">{formatCurrency(c.totalCost, displayCurrency)}</td>
                        <td className={cn('px-4 py-3 font-mono font-semibold', pos ? 'text-profit' : 'text-loss')}>
                          {formatCurrency(c.totalPnl, displayCurrency)}
                        </td>
                        <td className={cn('px-4 py-3 font-semibold', pos ? 'text-profit' : 'text-loss')}>
                          {formatPercent(c.pnlPercent)}
                        </td>
                        <td className="px-4 py-3 pr-6">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, alloc)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {alloc.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  label,
  value,
  trend,
}: {
  label: string
  value: string
  trend?: 'up' | 'down'
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className={cn(
              'text-xl font-bold',
              trend === 'up' && 'text-profit',
              trend === 'down' && 'text-loss'
            )}
          >
            {value}
          </span>
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-profit" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-loss" />}
        </div>
      </CardContent>
    </Card>
  )
}
