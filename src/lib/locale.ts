export type DrawerSide = 'left' | 'right'

export function normalizeLocale(locale?: string | null) {
  return locale?.trim().toLowerCase().split(/[-_]/)[0] ?? ''
}

export function getPreferredLocale() {
  if (typeof window === 'undefined') return 'en'

  return (
    window.localStorage.getItem('eden-language') ||
    window.localStorage.getItem('i18nextLng') ||
    document.documentElement.lang ||
    window.navigator.language ||
    'en'
  )
}

export function getDrawerSide(locale: string): DrawerSide {
  return normalizeLocale(locale) === 'he' ? 'right' : 'left'
}
