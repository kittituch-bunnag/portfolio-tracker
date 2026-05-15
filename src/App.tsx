import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { Summary } from '@/pages/Summary'
import { CategoryPage } from '@/pages/CategoryPage'

function useSystemDark() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (dark: boolean) => document.documentElement.classList.toggle('dark', dark)
    apply(mq.matches)
    mq.addEventListener('change', (e) => apply(e.matches))
    return () => mq.removeEventListener('change', () => {})
  }, [])
}

export default function App() {
  useSystemDark()

  return (
    <TooltipProvider>
      <HashRouter>
        <div className="min-h-screen bg-background">
          <Header />
          <Sidebar />
          <main className="ml-56 pt-14 min-h-[calc(100vh-3.5rem)]">
            <div className="p-6 max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Summary />} />
                <Route path="/us-stocks" element={<CategoryPage category="us-stocks" />} />
                <Route path="/etfs" element={<CategoryPage category="etf" />} />
                <Route path="/thai-mutual-funds" element={<CategoryPage category="thai-mutual-funds" />} />
                <Route path="/thai-stocks-drs" element={<CategoryPage category="thai-stocks-drs" />} />
                <Route path="/emergency-cash" element={<CategoryPage category="emergency-cash" />} />
                <Route path="/gold" element={<CategoryPage category="gold" />} />
                <Route path="/crypto" element={<CategoryPage category="crypto" />} />
              </Routes>
            </div>
          </main>
        </div>
      </HashRouter>
    </TooltipProvider>
  )
}
