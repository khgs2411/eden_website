import { useEffect, useState, type FormEvent } from 'react'
import { Globe2, Menu, Moon, Sun, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { languages, type LanguageCode } from '@/i18n'
import { getDrawerSide, getPreferredLocale, type DrawerSide } from '@/lib/locale'
import { supabase } from '@/lib/supabase'

const navItems = [
  { key: 'classes', href: '#classes' },
  { key: 'instructors', href: '#instructors' },
  { key: 'studio', href: '#studio' },
  { key: 'signup', href: '#signup' },
] as const

const classItems = ['private', 'group', 'events'] as const

function App() {
  const { t, i18n } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [drawerSide, setDrawerSide] = useState<DrawerSide>(() =>
    getDrawerSide(getPreferredLocale()),
  )
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  })
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'he').split('-')[0] as LanguageCode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const updateDrawerSide = () => setDrawerSide(getDrawerSide(getPreferredLocale()))
    const observer = new MutationObserver(updateDrawerSide)

    observer.observe(document.documentElement, {
      attributeFilter: ['lang'],
      attributes: true,
    })

    window.addEventListener('languagechange', updateDrawerSide)
    window.addEventListener('storage', updateDrawerSide)

    return () => {
      observer.disconnect()
      window.removeEventListener('languagechange', updateDrawerSide)
      window.removeEventListener('storage', updateDrawerSide)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormStatus('submitting')

    if (!supabase) {
      setFormStatus('error')
      return
    }

    const formData = new FormData(event.currentTarget)
    const { error } = await supabase.from('lesson_signups').insert({
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      notes: String(formData.get('notes') ?? ''),
    })

    if (error) {
      setFormStatus('error')
      return
    }

    event.currentTarget.reset()
    setFormStatus('success')
  }

  function handleLanguageChange(language: LanguageCode) {
    i18n.changeLanguage(language)
    setLanguageOpen(false)
    setMenuOpen(false)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="#" className="text-lg font-semibold tracking-wide">
            {t('brand')}
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {t(`nav.${item.key}`)}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('language.label')}
                aria-expanded={languageOpen}
                onClick={() => setLanguageOpen((open) => !open)}
              >
                <Globe2 className="size-5" />
              </Button>
              {languageOpen && (
                <div className="absolute end-0 top-11 z-50 min-w-36 rounded-md border border-border bg-card p-1 shadow-lg">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm text-card-foreground hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleLanguageChange(language.code)}
                    >
                      <span>{language.label}</span>
                      {currentLanguage === language.code && <span aria-hidden="true">•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('theme.toggle')}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={t('menu.toggle')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/35"
            aria-label={t('menu.close')}
            onClick={() => setMenuOpen(false)}
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
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <a href="#" className="text-lg font-semibold tracking-wide" onClick={() => setMenuOpen(false)}>
                {t('brand')}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('menu.close')}
                onClick={() => setMenuOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>

            <nav className="grid gap-1 p-4">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="rounded-md px-3 py-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setMenuOpen(false)}
                >
                  {t(`nav.${item.key}`)}
                </a>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-24">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t('hero.eyebrow')}
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl md:text-7xl">
              {t('hero.title')}
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              {t('hero.body')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <a href="#signup">{t('hero.primaryCta')}</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#classes">{t('hero.secondaryCta')}</a>
            </Button>
          </div>
        </div>

        <div className="min-h-[420px] overflow-hidden rounded-lg border border-border bg-muted">
          <div className="flex h-full min-h-[420px] flex-col justify-end bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),transparent_20%),linear-gradient(135deg,#111827,#3b2f2f_48%,#f5f5f4)] p-6 text-white dark:bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_20%),linear-gradient(135deg,#050505,#1f2937_48%,#7c2d12)]">
            <p className="max-w-xs text-2xl font-semibold leading-tight">
              {t('hero.visual')}
            </p>
          </div>
        </div>
      </section>

      <section id="classes" className="border-y border-border bg-muted/45">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3">
          {classItems.map((item) => (
            <article key={item} className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-xl font-semibold">{t(`classes.${item}.title`)}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {t(`classes.${item}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="signup" className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">{t('signup.title')}</h2>
          <p className="mt-4 text-muted-foreground">
            {t('signup.body')}
          </p>
        </div>

        <form className="grid gap-4 rounded-lg border border-border bg-card p-5" onSubmit={handleSignup}>
          <div className="grid gap-2">
            <Label htmlFor="name">{t('signup.name')}</Label>
            <Input id="name" name="name" placeholder={t('signup.namePlaceholder')} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('signup.email')}</Label>
            <Input id="email" name="email" type="email" placeholder={t('signup.emailPlaceholder')} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{t('signup.notes')}</Label>
            <Textarea id="notes" name="notes" placeholder={t('signup.notesPlaceholder')} />
          </div>
          <Button type="submit" disabled={formStatus === 'submitting'}>
            {formStatus === 'submitting' ? t('signup.submitting') : t('signup.submit')}
          </Button>
          {formStatus === 'success' && (
            <p className="text-sm text-muted-foreground">{t('signup.success')}</p>
          )}
          {formStatus === 'error' && (
            <p className="text-sm text-muted-foreground">{t('signup.error')}</p>
          )}
        </form>
      </section>
    </main>
  )
}

export default App
