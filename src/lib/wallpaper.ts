export type WallpaperMode = 'mesh' | 'solid' | 'gradient-a' | 'gradient-b' | 'custom'

export type WallpaperPrefs = {
  mode: WallpaperMode
  url?: string | null
}

export const WALLPAPER_STORAGE_KEY = 'eudachat.wallpaper'

export const WALLPAPER_PRESETS: Array<{ mode: Exclude<WallpaperMode, 'custom'>; label: string; hint: string }> = [
  { mode: 'mesh', label: 'Default mesh', hint: 'Theme cyan/indigo glows' },
  { mode: 'solid', label: 'Solid', hint: 'Flat theme background' },
  { mode: 'gradient-a', label: 'Soft dawn', hint: 'Warm cyan sweep' },
  { mode: 'gradient-b', label: 'Dusk indigo', hint: 'Deep indigo wash' }
]

export function readWallpaperPrefs (): WallpaperPrefs {
  if (typeof window === 'undefined') return { mode: 'mesh' }
  try {
    const raw = window.localStorage.getItem(WALLPAPER_STORAGE_KEY)
    if (!raw) return { mode: 'mesh' }
    const parsed = JSON.parse(raw) as WallpaperPrefs
    if (!parsed?.mode) return { mode: 'mesh' }
    return {
      mode: parsed.mode,
      url: parsed.url ?? null
    }
  } catch {
    return { mode: 'mesh' }
  }
}

export function writeWallpaperPrefs (prefs: WallpaperPrefs) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(prefs))
  window.dispatchEvent(new CustomEvent('eudachat:wallpaper', { detail: prefs }))
}
