import { Globe2, Menu, Moon, Sun, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageMenu } from '@/components/layout/language-menu'
import { Button } from '@/components/ui/button'
import { navItems } from '@/data/site'
import type { Theme } from '@/hooks/use-theme'
import { languages, type LanguageCode } from '@/i18n'
import type { DrawerSide } from '@/lib/locale'
import { cn } from '@/lib/utils'

type SiteHeaderProps = {
  drawerSide: DrawerSide
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  onThemeToggle: () => void
  theme: Theme
}

export function SiteHeader({
  drawerSide,
  menuOpen,
  onMenuOpenChange,
  onThemeToggle,
  theme,
}: SiteHeaderProps) {
  const { t, i18n } = useTranslation()
  const [isScrolled, setIsScrolled] = useState(false)
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'he').split('-')[0] as LanguageCode

  function handleLanguageChange(language: LanguageCode) {
    i18n.changeLanguage(language)
  }

  useEffect(() => {
    const updateScrolled = () => setIsScrolled(window.scrollY > 8)

    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })

    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed left-1/2 top-0 z-50 w-full max-w-(--shell-width) -translate-x-1/2 transition-colors duration-200',
          isScrolled
            ? 'border-b border-border/70 bg-background/95 shadow-sm backdrop-blur'
            : 'bg-transparent',
        )}
        dir="ltr"
      >
        <div className="mx-auto flex h-16 items-center justify-between px-6">
          <a href="#home" className="font-display text-xl font-bold uppercase tracking-[0.42em]">
            {t('brand')}
          </a>

          <div className="flex items-center gap-0.5">
            <LanguageMenu onLanguageChange={() => onMenuOpenChange(false)} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 opacity-70 hover:opacity-100"
              aria-label={t('theme.toggle')}
              onClick={onThemeToggle}
            >
              {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label={t('menu.toggle')}
              aria-expanded={menuOpen}
              onClick={() => onMenuOpenChange(!menuOpen)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>
      </header>

      {menuOpen && (
        // Constrained to the phone-width column so the drawer opens inside the site on desktop too.
        <div className="fixed inset-y-0 left-1/2 z-[70] w-full max-w-(--shell-width) -translate-x-1/2 overflow-hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/35"
            aria-label={t('menu.close')}
            onClick={() => onMenuOpenChange(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t('menu.mobileLabel')}
            className={`absolute top-0 flex h-full w-[min(82vw,22rem)] flex-col border-border bg-background shadow-2xl ${
              drawerSide === 'right'
                ? 'right-0 border-l animate-in slide-in-from-right'
                : 'left-0 border-r animate-in slide-in-from-left'
            }`}
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <a
                href="#home"
                className="font-display text-lg font-black uppercase tracking-[0.34em]"
                onClick={() => onMenuOpenChange(false)}
              >
                {t('brand')}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('menu.close')}
                onClick={() => onMenuOpenChange(false)}
              >
                <X className="size-5" />
              </Button>
            </div>

            <nav className="grid gap-1 p-4">
              {navItems.map((item, index) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="group flex items-baseline gap-3 rounded-md px-3 py-3 font-display text-3xl font-bold uppercase tracking-[0.02em] text-foreground/80 transition hover:text-accent-foreground"
                  onClick={() => onMenuOpenChange(false)}
                >
                  <span className="text-xs tracking-[0.3em] text-accent-foreground">{String(index + 1).padStart(2, '0')}</span>
                  {t(`nav.${item.key}`)}
                </a>
              ))}
            </nav>

            <div className="grid gap-3 border-t border-border p-4">
              <div className="rounded-md border border-border px-3 py-3">
                <div className="flex items-center justify-between gap-3 font-display text-sm font-bold uppercase tracking-[0.14em]">
                  <span>{t('language.label')}</span>
                  <Globe2 className="size-4" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1">
                  {languages.map((language) => (
                    <Button
                      key={language.code}
                      type="button"
                      variant={currentLanguage === language.code ? 'default' : 'ghost'}
                      className="h-9 px-2 text-xs font-bold"
                      aria-pressed={currentLanguage === language.code}
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      {language.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-between px-3 py-3 text-start font-display text-sm font-bold uppercase tracking-[0.14em]"
                aria-label={t('theme.toggle')}
                aria-pressed={theme === 'dark'}
                onClick={onThemeToggle}
              >
                <span>{t('theme.current', { mode: t(`theme.${theme}`) })}</span>
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
