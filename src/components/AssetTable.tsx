import { useState } from 'react'
import { Pencil, Trash2, RefreshCw, ArrowUpDown } from 'lucide-react'
import { AssetWithMarketData, DisplayCurrency } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AssetIcon } from '@/components/AssetIcon'
import { formatCurrency, formatPercent, formatNumber, formatPrice } from '@/utils/formatters'
import { convertCurrency } from '@/utils/calculations'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'currentValue' | 'pnlValue' | 'pnlPercent' | 'toSellGoalPercent'

interface AssetTableProps {
  assets: AssetWithMarketData[]
  displayCurrency: DisplayCurrency
  usdToThb: number
  loading?: boolean
  onEdit: (asset: AssetWithMarketData) => void
  onDelete: (id: string) => void
  onRefreshPrices: () => void
}

export function AssetTable({
  assets,
  displayCurrency,
  usdToThb,
  loading,
  onEdit,
  onDelete,
  onRefreshPrices,
}: AssetTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('currentValue')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...assets].sort((a, b) => {
    let aVal = 0, bVal = 0
    if (sortKey === 'name') {
      return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    }
    const convert = (asset: AssetWithMarketData, v: number) =>
      convertCurrency(v, asset.priceCurrency, displayCurrency, usdToThb)

    if (sortKey === 'currentValue') { aVal = convert(a, a.currentValue); bVal = convert(b, b.currentValue) }
    else if (sortKey === 'pnlValue') { aVal = convert(a, a.pnlValue); bVal = convert(b, b.pnlValue) }
    else if (sortKey === 'pnlPercent') { aVal = a.pnlPercent; bVal = b.pnlPercent }
    else if (sortKey === 'toSellGoalPercent') { aVal = a.toSellGoalPercent; bVal = b.toSellGoalPercent }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => handleSort(k)}
      >
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    )
  }

  const fmt = (asset: AssetWithMarketData, amount: number) =>
    formatCurrency(convertCurrency(amount, asset.priceCurrency, displayCurrency, usdToThb), displayCurrency)

  const fmtPrice = (asset: AssetWithMarketData, price: number) =>
    formatPrice(convertCurrency(price, asset.priceCurrency, displayCurrency, usdToThb), displayCurrency)

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onRefreshPrices} disabled={loading}>
          <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
          {loading ? 'Fetching…' : 'Refresh Prices'}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>
                <SortBtn k="name" label="Asset" />
              </TableHead>
              <TableHead className="text-right">Avg. Cost</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Mkt. Price</TableHead>
              <TableHead className="text-right">
                <SortBtn k="currentValue" label="Mkt. Value" />
              </TableHead>
              <TableHead className="text-right">Cost Basis</TableHead>
              <TableHead className="text-right">
                <SortBtn k="pnlValue" label="P&L" />
              </TableHead>
              <TableHead className="text-right">
                <SortBtn k="pnlPercent" label="P&L %" />
              </TableHead>
              <TableHead className="text-right">Buy Goal</TableHead>
              <TableHead className="text-right">
                <SortBtn k="toSellGoalPercent" label="Sell Goal" />
              </TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground py-12">
                  No assets yet. Click "Add Asset" to get started.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((asset, idx) => {
              const isPnlPos = asset.pnlValue >= 0
              return (
                <TableRow key={asset.id}>
                  <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <AssetIcon
                        ticker={asset.ticker}
                        category={asset.category}
                        coinGeckoId={asset.coinGeckoId}
                        size={24}
                      />
                      <div>
                        <div className="font-medium text-sm">{asset.ticker}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[140px]">{asset.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmtPrice(asset, asset.avgCost)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatNumber(asset.units)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {asset.currentPrice > 0 ? fmtPrice(asset, asset.currentPrice) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {asset.currentPrice > 0 ? fmt(asset, asset.currentValue) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{fmt(asset, asset.costBasis)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    <span className={cn('font-semibold', isPnlPos ? 'text-profit' : 'text-loss')}>
                      {asset.currentPrice > 0 ? fmt(asset, asset.pnlValue) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.currentPrice > 0 ? (
                      <Badge variant={isPnlPos ? 'profit' : 'loss'}>
                        {formatPercent(asset.pnlPercent)}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.buyGoalPrice ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-sm">{fmtPrice(asset, asset.buyGoalPrice)}</span>
                        {asset.currentPrice > 0 && (
                          <Badge variant={asset.toBuyGoalPercent >= 0 ? 'profit' : 'loss'}>
                            {formatPercent(asset.toBuyGoalPercent)}
                          </Badge>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {asset.sellGoalPrice ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-sm">{fmtPrice(asset, asset.sellGoalPrice)}</span>
                        {asset.currentPrice > 0 && (
                          <Badge variant={asset.toSellGoalPercent >= 0 ? 'profit' : 'loss'}>
                            {formatPercent(asset.toSellGoalPercent)}
                          </Badge>
                        )}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(asset)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(asset.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
