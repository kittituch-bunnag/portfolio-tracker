import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { AssetWithMarketData, DisplayCurrency } from '@/types'
import { convertCurrency } from '@/utils/calculations'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { cn } from '@/lib/utils'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6',
]

interface CategoryChartProps {
  assets: AssetWithMarketData[]
  displayCurrency: DisplayCurrency
  usdToThb: number
  className?: string
}

export function AllocationChart({ assets, displayCurrency, usdToThb, className }: CategoryChartProps) {
  const data = assets
    .filter((a) => a.currentValue > 0)
    .map((a) => ({
      name: a.ticker,
      value: Math.max(0, convertCurrency(a.currentValue, a.priceCurrency, displayCurrency, usdToThb)),
    }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-muted-foreground">Allocation by Value</p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <RTooltip
            formatter={(value: number) => [
              formatCurrency(value, displayCurrency),
              `${((value / total) * 100).toFixed(1)}%`,
            ]}
          />
          <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function PnlBarChart({ assets, displayCurrency, usdToThb, className }: CategoryChartProps) {
  const data = assets
    .filter((a) => a.currentPrice > 0)
    .map((a) => ({
      name: a.ticker,
      pnl: convertCurrency(a.pnlValue, a.priceCurrency, displayCurrency, usdToThb),
      pnlPct: a.pnlPercent,
    }))
    .sort((a, b) => b.pnl - a.pnl)

  if (data.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-sm font-medium text-muted-foreground">P&L by Asset</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formatCurrency(v, displayCurrency, true)}
          />
          <RTooltip
            formatter={(value: number, name: string) => {
              if (name === 'pnl') return [formatCurrency(value, displayCurrency), 'P&L']
              return [formatPercent(value), 'P&L %']
            }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? 'hsl(var(--profit))' : 'hsl(var(--loss))'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
