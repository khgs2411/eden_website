import { useTranslation } from 'react-i18next'
import type { CSSProperties } from 'react'

import type { Theme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

type HeroSectionProps = {
  theme: Theme
}

export function HeroSection({ theme }: HeroSectionProps) {
  const { t, i18n } = useTranslation()
  const assetBase = import.meta.env.BASE_URL
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'he'
  const isRtl = language.startsWith('he')
  const movementText = t('hero.movement')
  const movementLines = movementText
    .replace(/\s+לבוגרים\.?$/i, '|לבוגרים.')
    .replace(/^Adult\s+/i, 'Adult|')
    .replace(/\s+for adults\.?$/i, '|for adults.')
    .replace(/\s+для взрослых\.?$/i, '|для взрослых.')
    .split('|')
  const imagePosition = isRtl ? 'left top' : 'right top'
  const imageTransform =
    theme === 'light'
      ? isRtl
        ? 'translate(-8%, -7%) scale(1.14) scaleX(-1)'
        : 'translate(8%, -7%) scale(1.14)'
      : isRtl
        ? 'scale(1.09) scaleX(-1)'
        : 'scale(1.09)'
  const desktopImageTransform =
    theme === 'light'
      ? isRtl
        ? 'translate(-4%, -4%) scale(1.03) scaleX(-1)'
        : 'translate(4%, -4%) scale(1.03)'
      : isRtl
        ? 'translate(-3%, -2%) scale(1.02) scaleX(-1)'
        : 'translate(3%, -2%) scale(1.02)'
  const nameLine = [t('hero.noLimits'), t('hero.just')].filter(Boolean).join(' ')
  const headingClassName = cn(
    'font-display font-bold uppercase leading-[0.92] tracking-[-0.035em]',
    'text-[clamp(2.85rem,12vw,3.45rem)] sm:text-[3.7rem] lg:text-[4rem]',
  )
  const headingWrapperClassName = cn(
    'ltr:text-left rtl:ms-auto rtl:text-right',
    'max-w-[30rem] lg:max-w-[44rem]',
  )
  const movementLineClassName = cn(
    'brush-text leading-[0.75] text-accent-foreground',
    'text-[clamp(2.65rem,12vw,3.25rem)] sm:text-[3.45rem] lg:text-[4.15rem]',
  )

  return (
    <section id="home" className="relative flex min-h-[700px] items-start overflow-visible px-7 pb-0 pt-52 lg:min-h-[760px] lg:px-12 lg:pt-60">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={`${assetBase}assets/${theme === 'dark' ? 'image_1.jpg' : 'image_3.jpg'}`}
          alt=""
          className="hero-image absolute inset-0 z-0 size-full object-cover opacity-95 grayscale dark:opacity-90"
          style={{
            objectPosition: imagePosition,
            '--hero-image-transform': imageTransform,
            '--hero-image-transform-desktop': desktopImageTransform,
          } as CSSProperties}
        />
        <div className="absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgba(250,248,245,0.97)_0%,rgba(250,248,245,0.52)_34%,rgba(250,248,245,0.02)_68%),linear-gradient(180deg,rgba(250,248,245,0)_0%,rgba(250,248,245,0)_42%,rgba(250,248,245,0.82)_67%,rgba(250,248,245,1)_80%,rgba(250,248,245,1)_100%)] rtl:bg-[linear-gradient(270deg,rgba(250,248,245,0.97)_0%,rgba(250,248,245,0.52)_34%,rgba(250,248,245,0.02)_68%),linear-gradient(180deg,rgba(250,248,245,0)_0%,rgba(250,248,245,0)_42%,rgba(250,248,245,0.82)_67%,rgba(250,248,245,1)_80%,rgba(250,248,245,1)_100%)] dark:bg-[linear-gradient(90deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.48)_34%,rgba(0,0,0,0.04)_70%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_42%,rgba(0,0,0,0.86)_67%,rgba(0,0,0,1)_80%,rgba(0,0,0,1)_100%)] dark:rtl:bg-[linear-gradient(270deg,rgba(0,0,0,0.96)_0%,rgba(0,0,0,0.48)_34%,rgba(0,0,0,0.04)_70%),linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_42%,rgba(0,0,0,0.86)_67%,rgba(0,0,0,1)_80%,rgba(0,0,0,1)_100%)]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-[2] h-64 bg-gradient-to-b from-transparent via-background to-background" />
      <div className="absolute inset-x-0 -bottom-44 z-[2] h-44 bg-background" />

      <div className="relative z-10 w-full">
        <div className={headingWrapperClassName}>
          <h1 className={headingClassName}>
            <span className="whitespace-nowrap">{nameLine}</span>
            <br />
            <span className="mt-1 block">
              {movementLines.map((line) => (
                <span key={line} className="block">
                  <span className={movementLineClassName}>{line}</span>
                </span>
              ))}
            </span>
          </h1>
        </div>
      </div>
    </section>
  )
}
