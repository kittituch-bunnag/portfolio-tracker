import { NavLink, useLocation } from 'react-router-dom'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const assets = usePortfolioStore((s) => s.assets)
  const { pathname } = useLocation()

  function count(category: AssetCategory) {
    return assets.filter((a) => a.category === category).length
  }

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname === to || pathname.startsWith(to + '/')
  }

  return (
    <nav
      className="fixed top-14 left-0 h-[calc(100vh-3.5rem)] border-r bg-background/95 backdrop-blur overflow-y-auto z-20 transition-[width] duration-300"
      style={{ width: collapsed ? '3.5rem' : '14rem' }}
    >
      <div className="py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact, category }) => {
          const badge = category && count(category) > 0 ? count(category) : null
          const active = isActive(to, exact)
          const itemClass = cn(
            'flex items-center px-3 py-2 rounded-md text-sm transition-colors',
            active
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )

          if (collapsed) {
            return (
              <Tooltip key={to} delayDuration={100}>
                <TooltipTrigger asChild>
                  <NavLink to={to} end={exact} className={cn(itemClass, 'justify-center')}>
                    <Icon className="h-4 w-4 shrink-0" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {label}{badge != null ? ` (${badge})` : ''}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={cn(itemClass, 'gap-2.5')}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {badge != null && (
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
