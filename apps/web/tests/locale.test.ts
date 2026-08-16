import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, parseLocale } from '../src/lib/locale'

describe('parseLocale', () => {
  it('opts into Trinidadian Creole only when asked', () => {
    expect(parseLocale('tcr')).toBe('tcr')
    expect(parseLocale('en')).toBe(DEFAULT_LOCALE)
    expect(parseLocale('en-TT')).toBe(DEFAULT_LOCALE)
    expect(parseLocale(undefined)).toBe(DEFAULT_LOCALE)
  })
})
