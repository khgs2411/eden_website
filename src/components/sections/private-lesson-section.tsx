import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { lessonGroups } from '@/data/site'

// Section numbering continues after the lesson groups and the "who is this for" spread.
const sectionIndex = lessonGroups.length + 2

export function PrivateLessonSection() {
  const { t } = useTranslation()
  const assetBase = import.meta.env.BASE_URL
  const [lead, ...paragraphs] = t('about.body').split('\n\n')

  return (
    <section id="private-lesson" className="relative px-5 pb-16 pt-4">
      <Reveal>
        <SectionHeading index={sectionIndex} title={t('about.title')} />
      </Reveal>

      {/* Full-bleed portrait with the name set in outline across its foot. */}
      <Reveal>
        <figure className="relative -mx-5 aspect-[4/5] overflow-hidden">
          <img src={`${assetBase}assets/image_2.jpg`} alt="" className="size-full object-cover object-[42%_center] grayscale" loading="lazy" />
          <div className="absolute inset-0 bg-linear-to-b from-background/10 via-transparent to-background" />
          <figcaption
            aria-hidden="true"
            className="text-outline absolute inset-x-5 bottom-2 font-display text-[4.5rem] font-bold uppercase leading-[0.85] tracking-[-0.02em]"
          >
            {t('hero.noLimits')}
          </figcaption>
        </figure>
      </Reveal>

      <Reveal>
        <p className="mt-8 whitespace-pre-line font-display text-xl font-bold leading-snug text-foreground">{lead}</p>
      </Reveal>

      <div className="mt-6 space-y-5 border-s-2 border-accent-foreground/50 ps-4">
        {paragraphs.map((paragraph) => (
          <Reveal key={paragraph}>
            <p className="whitespace-pre-line text-sm font-semibold leading-7 text-foreground/80">{paragraph}</p>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <a
          href="#lessons"
          className="group mt-10 flex items-center justify-between gap-4 rounded-xl border border-accent-foreground/50 bg-accent-foreground/10 p-5 text-start transition hover:-translate-y-0.5 hover:border-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground"
        >
          <span>
            <span className="block font-display text-lg font-bold uppercase leading-tight tracking-[0.06em]">{t('about.registrationCard.title')}</span>
            <span className="mt-1 block text-sm font-semibold leading-6 text-muted-foreground">{t('about.registrationCard.body')}</span>
          </span>
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-foreground text-background transition-transform group-hover:scale-105"
            aria-label={t('about.registrationCard.cta')}
          >
            <ArrowRight className="size-5 rtl:-scale-x-100" strokeWidth={2.4} aria-hidden="true" />
          </span>
        </a>
      </Reveal>
    </section>
  )
}
