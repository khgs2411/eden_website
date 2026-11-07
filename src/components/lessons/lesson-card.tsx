import { ArrowRight, Clock, MapPin } from 'lucide-react'
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
        className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border/80 bg-card/82 p-5 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 "
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-l from-transparent via-accent-foreground/80 to-transparent"
        />
        <span
          aria-hidden="true"
          className="font-display text-5xl font-bold leading-none text-transparent [-webkit-text-stroke:1px_var(--accent-foreground)]"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        {copy.title && (
          <span className="mt-4 font-display text-[1.15rem] font-bold uppercase leading-tight tracking-[0.08em] text-foreground/92">
            {copy.title}
          </span>
        )}
        <span className="mt-3 flex-1 whitespace-pre-line text-sm font-semibold leading-6 text-muted-foreground">{copy.body}</span>
        <span className="mt-6 inline-flex items-center gap-2 self-start rounded-sm border border-accent-foreground/65 px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground transition-colors group-hover:bg-accent-foreground group-hover:text-background">
          {copy.cta ?? t('lessons.signupCta')}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.4} />
        </span>
      </a>
    )
  }

  const regularLesson = lesson
  const location = t(`locations.${regularLesson.location}`)
  const style = t(`lessonStyles.${regularLesson.style}`)
  const styleSubtitle = t(`lessonStyleSubtitles.${regularLesson.styleSubtitle}`)

  // Ticket: a stub (date, or weekday for recurring classes) torn off by a perforated line,
  // and the admission details beside it.
  return (
    <a
      href={regularLesson.signupUrl}
      target="_blank"
      rel="noreferrer"
      className="group grid w-full grid-cols-[5.25rem_minmax(0,1fr)] rounded-xl border border-border/80 bg-card/80 text-start shadow-[0_14px_40px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-accent-foreground/60 dark:bg-card/45"
    >
      <span className="ticket-stub relative flex flex-col items-center justify-center border-e border-dashed border-border px-2 py-5 text-center font-display">
        {'day' in regularLesson ? (
          <span className="text-sm font-bold uppercase leading-tight tracking-[0.06em]">{t(`lessonDays.${regularLesson.day}`)}</span>
        ) : (
          // One line: day in the foreground colour, ".month" in accent.
          <span dir="ltr" className="whitespace-nowrap text-[1.75rem] font-bold leading-none">
            {regularLesson.date.split('.')[0]}
            <span className="text-accent-foreground">.{regularLesson.date.split('.')[1]}</span>
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-1.5 px-4 py-4">
        <span className="flex items-center gap-1.5 font-display text-[0.72rem] font-bold tracking-[0.12em] text-accent-foreground">
          <Clock className="size-3.5 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          {regularLesson.time}
        </span>
        <span className="font-display text-xl font-bold uppercase leading-tight tracking-[0.04em] text-foreground">{style}</span>
        <span className="text-sm font-bold leading-5 text-foreground/75">{styleSubtitle}</span>
        <span className="mt-1 flex items-start gap-1.5 text-xs font-semibold leading-5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {location}
        </span>
        <span className="mt-2 inline-flex items-center gap-1.5 self-end font-display text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground">
          {t('lessons.signupCta')}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.4} aria-hidden="true" />
        </span>
      </span>
    </a>
  )
}
