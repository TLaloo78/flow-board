import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

// Must match the pre-paint script in index.html.
const STORAGE_KEY = 'flow-board-theme'
const systemDark = window.matchMedia('(prefers-color-scheme: dark)')

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => storedTheme() ?? (systemDark.matches ? 'dark' : 'light'),
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Follow the OS setting until the user picks a theme explicitly.
  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(e.matches ? 'dark' : 'light')
    }
    systemDark.addEventListener('change', onChange)
    return () => systemDark.removeEventListener('change', onChange)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage blocked: the choice still applies for this session.
    }
    setTheme(next)
  }

  return { theme, toggleTheme }
}
