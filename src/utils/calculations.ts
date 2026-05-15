import { Asset, AssetWithMarketData, AssetCurrency, DisplayCurrency, CategorySummary, PortfolioSummary } from '@/types'

export function convertCurrency(
  amount: number,
  from: AssetCurrency,
  to: DisplayCurrency,
  usdToThb: number
): number {
  if (from === to) return amount
  if (from === 'USD' && to === 'THB') return amount * usdToThb
  if (from === 'THB' && to === 'USD') return amount / usdToThb
  return amount
}

export function calcAsset(
  asset: Asset,
  currentPrice: number
): AssetWithMarketData {
  const costBasis = asset.avgCost * asset.units
  const currentValue = currentPrice * asset.units
  const pnlValue = currentValue - costBasis
  const pnlPercent = costBasis > 0 ? (pnlValue / costBasis) * 100 : 0
  const toGoalPercent =
    currentPrice > 0 ? ((asset.goalPrice - currentPrice) / currentPrice) * 100 : 0

  return {
    ...asset,
    currentPrice,
    costBasis,
    currentValue,
    pnlValue,
    pnlPercent,
    toGoalPercent,
  }
}

export function buildPortfolioSummary(
  assetsWithData: AssetWithMarketData[],
  displayCurrency: DisplayCurrency,
  usdToThb: number
): PortfolioSummary {
  const categoryMap = new Map<string, CategorySummary>()

  for (const asset of assetsWithData) {
    const value = convertCurrency(asset.currentValue, asset.priceCurrency, displayCurrency, usdToThb)
    const cost = convertCurrency(asset.costBasis, asset.priceCurrency, displayCurrency, usdToThb)
    const pnl = value - cost

    const existing = categoryMap.get(asset.category)
    if (existing) {
      existing.totalValue += value
      existing.totalCost += cost
      existing.totalPnl += pnl
      existing.assetCount++
    } else {
      categoryMap.set(asset.category, {
        category: asset.category,
        totalValue: value,
        totalCost: cost,
        totalPnl: pnl,
        pnlPercent: 0,
        assetCount: 1,
      })
    }
  }

  const categories = Array.from(categoryMap.values()).map((c) => ({
    ...c,
    pnlPercent: c.totalCost > 0 ? (c.totalPnl / c.totalCost) * 100 : 0,
  }))

  const totalValue = categories.reduce((s, c) => s + c.totalValue, 0)
  const totalCost = categories.reduce((s, c) => s + c.totalCost, 0)
  const totalPnl = totalValue - totalCost
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0

  return { totalValue, totalCost, totalPnl, pnlPercent, categories }
}
