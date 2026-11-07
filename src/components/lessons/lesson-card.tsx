import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Lesson } from '@/data/site'

type LessonCardProps = {
  lesson: Lesson
  index: number
}

export function LessonCard({ lesson, index }: LessonCardProps) {
  const { t } = useTranslation()

  if (!('style' in lesson)) {
    // Title and cta are optional per card; the cta falls back to the shared signup label.
    const copy = t(`lessons.contactCards.${lesson.copy}`, { returnObjects: true }) as { title?: string; body: string; cta?: string }

    // Offer tile: poster-style outlined number, title, copy, and a CTA anchored to the bottom so
    // side-by-side tiles line up regardless of copy length.
    return (
      <a
        href={lesson.href}
        target="_blank"
        rel="noreferrer"
        className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border/80 bg-card/82 p-5 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 lg:p-7"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-l from-transparent via-accent-foreground/80 to-transparent"
        />
        <span
          aria-hidden="true"
          className="font-display text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_var(--accent-foreground)] lg:text-6xl"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {copy.title && (
          <span className="mt-4 font-display text-[1.15rem] font-bold uppercase leading-tight tracking-[0.08em] text-foreground/92 lg:text-2xl">
            {copy.title}
          </span>
        )}
        <span className="mt-3 flex-1 whitespace-pre-line text-sm font-semibold leading-6 text-muted-foreground lg:text-base lg:leading-7">{copy.body}</span>
        <span className="mt-6 inline-flex items-center gap-2 self-start rounded-sm border border-accent-foreground/65 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground transition-colors group-hover:bg-accent-foreground group-hover:text-background">
          {copy.cta ?? t('lessons.signupCta')}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.4} />
        </span>
      </a>
    )
  }

  const regularLesson = lesson
  const location = t(`locations.${regularLesson.location}`)
  const heading = 'day' in regularLesson ? t(`lessonDays.${regularLesson.day}`) : regularLesson.date
  const style = t(`lessonStyles.${regularLesson.style}`)
  const styleSubtitle = t(`lessonStyleSubtitles.${regularLesson.styleSubtitle}`)
  const cardClassName =
    "grid w-full grid-cols-[1fr_max-content] items-stretch rounded-md border border-border/80 bg-card/82 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 lg:min-h-[5.75rem] lg:grid-cols-[8.9rem_minmax(0,1fr)_max-content] lg:px-3.5 lg:py-3"

  return (
    <a href={regularLesson.signupUrl} target="_blank" rel="noreferrer" className={cardClassName}>
      <span className="flex flex-col justify-center px-4 py-3 font-display uppercase lg:border-e lg:border-border lg:px-0 lg:py-0 lg:pe-3">
        <span className="block text-[1rem] font-bold leading-tight tracking-[0.08em] lg:text-[1.25rem] lg:leading-none">
          <span className="lg:hidden">
            {heading} - {style}
          </span>
          <span className="hidden lg:block">{heading}</span>
        </span>
        <span className="mt-1 block text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground lg:hidden">{styleSubtitle}</span>
        <span className="mt-1 block text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground">
          <span className="lg:hidden">
            {location} - {regularLesson.time.replace(/\s+-\s+/g, '-')}
          </span>
          <span className="hidden lg:block">{location}</span>
        </span>
      </span>
      <span className="hidden min-w-0 content-center gap-1 px-4 lg:grid lg:px-0 lg:ps-4">
        <span className="hidden font-display text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground lg:block">
          {regularLesson.time}
        </span>
        <span className="font-display text-lg font-bold uppercase tracking-[0.08em] text-foreground/92">
          {style}
        </span>
        <span className="font-display text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground">
          {styleSubtitle}
        </span>
      </span>
      <span className="flex items-center justify-end border-s border-border/70 px-4 lg:border-s-0 lg:px-0 lg:ps-3">
        <span className="rounded-sm border border-accent-foreground/65 px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground">
          {t('lessons.signupCta')}
        </span>
      </span>
    </a>
  )
}
