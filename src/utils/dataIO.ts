import { Asset, AssetCategory } from '@/types'

export type CategoryMap = Partial<Record<AssetCategory, Asset[]>>

export interface PortfolioExport {
  version: 2
  exportedAt: string
  assets: CategoryMap
}

export function flattenExport(exported: PortfolioExport): Asset[] {
  return (Object.values(exported.assets) as Asset[][]).flat()
}

export function exportToJson(assets: Asset[]): void {
  const categoryMap: CategoryMap = {}
  for (const asset of assets) {
    if (!categoryMap[asset.category]) categoryMap[asset.category] = []
    categoryMap[asset.category]!.push(asset)
  }
  const data: PortfolioExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    assets: categoryMap,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseImportFile(file: File): Promise<PortfolioExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (!isValidExport(parsed)) {
          reject(new Error('Invalid portfolio JSON — expected { version: 2, assets: { "us-stocks": [...], ... } }'))
          return
        }
        resolve(parsed as PortfolioExport)
      } catch {
        reject(new Error('Failed to parse JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function isValidExport(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (d.version !== 2) return false
  if (typeof d.assets !== 'object' || d.assets === null || Array.isArray(d.assets)) return false
  return Object.values(d.assets as Record<string, unknown>).every(
    (arr) => Array.isArray(arr) && (arr as unknown[]).every(isValidAsset)
  )
}

function isValidAsset(a: unknown): boolean {
  if (typeof a !== 'object' || a === null) return false
  const asset = a as Record<string, unknown>
  return (
    typeof asset.id === 'string' &&
    typeof asset.category === 'string' &&
    typeof asset.ticker === 'string' &&
    typeof asset.name === 'string' &&
    typeof asset.avgCost === 'number' &&
    typeof asset.units === 'number' &&
    typeof asset.priceCurrency === 'string'
  )
}
