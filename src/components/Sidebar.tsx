import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Landmark,
  BarChart2,
  Banknote,
  Coins,
  Bitcoin,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortfolioStore } from '@/store/portfolioStore'
import { AssetCategory } from '@/types'

const NAV_ITEMS = [
  { to: '/', label: 'Summary', icon: LayoutDashboard, exact: true },
  { to: '/us-stocks', label: 'US Stocks', icon: TrendingUp, category: 'us-stocks' as AssetCategory },
  { to: '/etfs', label: 'ETFs', icon: Package, category: 'etf' as AssetCategory },
  { to: '/thai-mutual-funds', label: 'Thai Mutual Funds', icon: Landmark, category: 'thai-mutual-funds' as AssetCategory },
  { to: '/thai-stocks-drs', label: 'Thai Stocks & DRs', icon: BarChart2, category: 'thai-stocks-drs' as AssetCategory },
  { to: '/emergency-cash', label: 'Emergency & Cash', icon: Banknote, category: 'emergency-cash' as AssetCategory },
  { to: '/gold', label: 'Gold', icon: Coins, category: 'gold' as AssetCategory },
  { to: '/crypto', label: 'Cryptocurrency', icon: Bitcoin, category: 'crypto' as AssetCategory },
]

export function Sidebar() {
  const assets = usePortfolioStore((s) => s.assets)

  function count(category: AssetCategory) {
    return assets.filter((a) => a.category === category).length
  }

  return (
    <nav className="fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-56 border-r bg-background/95 backdrop-blur overflow-y-auto z-20">
      <div className="py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, category }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            {category && count(category) > 0 && (
              <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {count(category)}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
