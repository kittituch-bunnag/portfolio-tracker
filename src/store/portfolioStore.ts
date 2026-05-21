import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Asset, DisplayCurrency } from '@/types'

interface PortfolioState {
  assets: Asset[]
  displayCurrency: DisplayCurrency
  usdToThb: number
  lastExchangeRateUpdate: string | null

  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  setDisplayCurrency: (currency: DisplayCurrency) => void
  setExchangeRate: (rate: number) => void
  importAssets: (incoming: Asset[], mode: 'merge' | 'replace') => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      assets: [],
      displayCurrency: 'THB',
      usdToThb: 35,
      lastExchangeRateUpdate: null,

      addAsset: (asset) =>
        set((state) => ({ assets: [...state.assets, asset] })),

      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      removeAsset: (id) =>
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) })),

      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),

      setExchangeRate: (rate) =>
        set({ usdToThb: rate, lastExchangeRateUpdate: new Date().toISOString() }),

      importAssets: (incoming, mode) =>
        set((state) => {
          if (mode === 'replace') return { assets: incoming }
          const existingIds = new Set(state.assets.map((a) => a.id))
          const newAssets = incoming.filter((a) => !existingIds.has(a.id))
          return { assets: [...state.assets, ...newAssets] }
        }),
    }),
    { name: 'investment-portfolio-v1' }
  )
)
