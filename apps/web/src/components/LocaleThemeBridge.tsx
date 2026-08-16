'use client'

import { useEffect } from 'react'
import { parseLocale } from '@/lib/locale'

export function LocaleThemeBridge ({ locale }: { locale?: string | null }) {
  useEffect(() => {
    document.documentElement.classList.toggle('tt-mode', parseLocale(locale) === 'tcr')
  }, [locale])
  return null
}
