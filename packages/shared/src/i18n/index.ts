/**
 * Tiny i18n shim. Real apps can swap this for i18next; the surface is small
 * and shared between web and mobile so we don't pay a runtime cost.
 *
 * Features:
 *  - `t(key, params?)` does straight key lookup with `{name}` interpolation.
 *  - `setLocale(id)` updates the active locale and notifies subscribers
 *    (so React components can re-render without a page reload).
 *  - `subscribe(fn)` returns an unsubscribe function — used by the `useT`
 *    hook in `./useT.ts`.
 *  - English-TT (`en-TT`) is the source-of-truth dictionary; missing keys
 *    in other locales fall back to it.
 */
import en from './locales/en-TT';
import tcr from './locales/tcr';

export const LOCALES = { 'en-TT': en, tcr } as const;
export type LocaleId = keyof typeof LOCALES;
export type StringKey = keyof typeof en;

let active: LocaleId = 'en-TT';

type Listener = (id: LocaleId) => void;
const listeners = new Set<Listener>();

export function getLocale(): LocaleId {
  return active;
}

export function setLocale(id: LocaleId): void {
  if (id === active) return;
  active = id;
  for (const l of listeners) {
    try {
      l(id);
    } catch {
      /* ignore individual listener errors */
    }
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  const dict = LOCALES[active] as Record<string, string>;
  let s =
    dict[key] ??
    (LOCALES['en-TT'] as Record<string, string>)[key] ??
    (key as string);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

// Re-export raw dictionaries for tooling / tests.
export { default as enTtDict } from './locales/en-TT';
export { default as tcrDict } from './locales/tcr';
