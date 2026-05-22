import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type Theme = 'light' | 'dark'

// Auto mode: 06:00–20:00 = light, otherwise dark
const AUTO_DAY_START = 6
const AUTO_DAY_END = 20

function resolveAutoTheme(): Theme {
  const hour = new Date().getHours()
  return hour >= AUTO_DAY_START && hour < AUTO_DAY_END ? 'light' : 'dark'
}

function resolveTheme(mode: ThemeMode): Theme {
  return mode === 'auto' ? resolveAutoTheme() : mode
}

function getInitialMode(): ThemeMode {
  const stored = localStorage.getItem('themeMode') as ThemeMode | null
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  // Migrate from legacy single-key storage
  const legacy = localStorage.getItem('theme') as Theme | null
  if (legacy === 'light' || legacy === 'dark') return legacy
  return 'auto'
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getInitialMode()))

  // Apply CSS class and persist whenever mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode)
    setTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    localStorage.setItem('themeMode', mode)
  }, [mode])

  // In auto mode, re-check every minute so the switch happens within 60 s of the hour boundary
  useEffect(() => {
    if (mode !== 'auto') return
    const id = setInterval(() => {
      const resolved = resolveAutoTheme()
      setTheme(resolved)
      document.documentElement.classList.toggle('dark', resolved === 'dark')
    }, 60_000)
    return () => clearInterval(id)
  }, [mode])

  // Cycle: light → dark → auto → light
  function cycleMode() {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'auto' : 'light'))
  }

  return { theme, themeMode: mode, cycleMode }
}
