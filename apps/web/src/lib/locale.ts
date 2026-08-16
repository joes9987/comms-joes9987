export const LOCALES = ['en', 'tcr'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export function parseLocale (value: unknown): Locale {
  return value === 'tcr' ? 'tcr' : DEFAULT_LOCALE
}
