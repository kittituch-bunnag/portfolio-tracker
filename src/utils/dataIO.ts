import { Asset } from '@/types'

export interface PortfolioExport {
  version: 1
  exportedAt: string
  assets: Asset[]
}

export function exportToJson(assets: Asset[]): void {
  const data: PortfolioExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    assets,
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
          reject(new Error('Invalid portfolio JSON — expected { version: 1, assets: [...] }'))
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
  return d.version === 1 && Array.isArray(d.assets) && (d.assets as unknown[]).every(isValidAsset)
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
    typeof asset.goalPrice === 'number' &&
    typeof asset.priceCurrency === 'string'
  )
}
