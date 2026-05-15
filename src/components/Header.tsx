import { useState, useEffect } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortfolioStore } from '@/store/portfolioStore'
import { fetchUsdToThb } from '@/services/exchangeRate'

import { cn } from '@/lib/utils'

export function Header() {
  const { displayCurrency, setDisplayCurrency, usdToThb, setExchangeRate, lastExchangeRateUpdate } =
    usePortfolioStore()
  const [fetchingRate, setFetchingRate] = useState(false)

  async function refreshRate() {
    setFetchingRate(true)
    try {
      const rate = await fetchUsdToThb()
      setExchangeRate(rate)
    } catch {
      // keep current rate
    } finally {
      setFetchingRate(false)
    }
  }

  // Auto-fetch rate on mount if stale (> 1 hour)
  useEffect(() => {
    if (!lastExchangeRateUpdate) { refreshRate(); return }
    const age = Date.now() - new Date(lastExchangeRateUpdate).getTime()
    if (age > 60 * 60 * 1000) refreshRate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 font-semibold text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span>Portfolio Tracker</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Exchange rate */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>1 USD =</span>
            <span className="font-semibold text-foreground">{usdToThb.toFixed(2)} THB</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={refreshRate} disabled={fetchingRate}>
              <RefreshCw className={cn('h-3 w-3', fetchingRate && 'animate-spin')} />
            </Button>
          </div>

          {/* Currency toggle */}
          <div className="flex rounded-md border overflow-hidden text-sm">
            {(['THB', 'USD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setDisplayCurrency(c)}
                className={cn(
                  'px-3 py-1 transition-colors',
                  displayCurrency === c
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
