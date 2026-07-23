'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle ({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={`h-9 w-9 rounded-xl border border-transparent ${className}`} aria-hidden />
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card-solid)] text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] ${className}`}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path d="M10 2a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm4.95 2.05a1 1 0 0 1 0 1.414L13.536 6.879a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0ZM17 9a1 1 0 1 1 0 2h-1.5a1 1 0 1 1 0-2H17Zm-2.05 4.95a1 1 0 0 1 1.414 0l1.414 1.414a1 1 0 1 1-1.414 1.414l-1.414-1.414a1 1 0 0 1 0-1.414ZM10 14.5a1 1 0 0 1 1 1V17a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1ZM5.05 13.536a1 1 0 0 1 1.414 1.414l-1.414 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414ZM3 9a1 1 0 0 1 0 2H1.5a1 1 0 1 1 0-2H3Zm2.05-4.95a1 1 0 1 1 1.414-1.414L7.879 4.05a1 1 0 1 1-1.414 1.414L5.05 4.05ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 9.958.75.75 0 0 1 .77.26 9 9 0 1 1-10.988-10.988Zm2.522 1.378a7.5 7.5 0 0 0 8.641 8.641.75.75 0 0 1-1.06 1.06A9 9 0 0 1 3.5 4.536a.75.75 0 0 1 1.06-1.06 7.5 7.5 0 0 0 5.417 1.902Z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}
