import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react'
import { manageHash, shouldLoadFeedback } from '@/features/feedback/activation'

import { AmbientBackdrop } from '@/components/layout/ambient-backdrop'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { HeroSection } from '@/components/sections/hero-section'
import { LessonsSection } from '@/components/sections/lessons-section'
import { PrivateLessonSection } from '@/components/sections/private-lesson-section'
import { useTheme } from '@/hooks/use-theme'
import { getDrawerSide, getPreferredLocale, type DrawerSide } from '@/lib/locale'

// Public visitors never download ClassKit: it loads only for #manage, a saved session, or an OAuth return.
const FeedbackRoot = lazy(() => import('@/features/feedback/feedback-root'))

function App() {
  const [manageOpen, setManageOpen] = useState(() => window.location.hash === manageHash)
  const [feedbackLoaded, setFeedbackLoaded] = useState(shouldLoadFeedback)
  const [managerActions, setManagerActions] = useState<ReactNode>(null)
  useEffect(() => {
    const update = () => {
      const open = window.location.hash === manageHash
      setManageOpen(open)
      if (open) setFeedbackLoaded(true)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  const closeManage = useCallback(() => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setManageOpen(false)
  }, [])
  const { theme, toggleTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  const openRequests = useCallback(() => {
    setMenuOpen(false)
    setRequestsOpen(true)
  }, [])
  const closeRequests = useCallback(() => setRequestsOpen(false), [])
  const [drawerSide, setDrawerSide] = useState<DrawerSide>(() =>
    getDrawerSide(getPreferredLocale()),
  )

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

  return (
    <>
    <AmbientBackdrop />
    {/* Mobile-first by principle: the site is a phone-width column at every screen size. */}
    <main className="relative z-10 mx-auto min-h-screen max-w-(--shell-width) overflow-hidden bg-background text-foreground shadow-[0_0_0_1px_var(--border),0_24px_80px_rgba(0,0,0,0.35)]">
      <SiteHeader
        drawerSide={drawerSide}
        menuOpen={menuOpen}
        onMenuOpenChange={setMenuOpen}
        onThemeToggle={toggleTheme}
        theme={theme}
        managerActions={managerActions ?? undefined}
      />
      {feedbackLoaded && (
        <Suspense fallback={null}>
          <FeedbackRoot
            theme={theme}
            menuOpen={menuOpen}
            requestsOpen={requestsOpen}
            manageOpen={manageOpen}
            onOpenRequests={openRequests}
            onCloseRequests={closeRequests}
            onCloseManage={closeManage}
            onManagerActions={setManagerActions}
          />
        </Suspense>
      )}
      <div className="bg-background">
        <HeroSection theme={theme} />
        <LessonsSection />
      </div>
      <PrivateLessonSection />
      <SiteFooter />
    </main>
    </>
  )
}

export default App
