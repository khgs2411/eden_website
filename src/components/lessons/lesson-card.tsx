import { useTranslation } from 'react-i18next'

import type { Lesson } from '@/data/site'

type LessonCardProps = {
  lesson: Lesson
}

export function LessonCard({ lesson }: LessonCardProps) {
  const { t } = useTranslation()

  if (!('style' in lesson)) {
    // Title and cta are optional per card; the cta falls back to the shared signup label.
    const copy = t(`lessons.contactCards.${lesson.copy}`, { returnObjects: true }) as { title?: string; body: string; cta?: string }

    return (
      <a
        href={lesson.href}
        target="_blank"
        rel="noreferrer"
        className="grid w-full grid-cols-[1fr_max-content] items-stretch rounded-md border border-border/80 bg-card/82 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 lg:min-h-[7.25rem] lg:grid-cols-[minmax(0,1fr)_max-content]"
      >
        <span className="grid min-w-0 content-center gap-2 px-4 py-5 lg:px-8 lg:py-6">
          {copy.title && (
            <span className="font-display text-[1.05rem] font-bold uppercase tracking-[0.08em] text-foreground/92 lg:text-2xl">{copy.title}</span>
          )}
          <span className="whitespace-pre-line text-sm font-semibold leading-5 text-muted-foreground lg:text-lg lg:leading-8">{copy.body}</span>
        </span>
        <span className="flex items-center justify-end border-s border-border/70 px-4 py-5 lg:border-s-0 lg:px-6">
          <span className="rounded-sm border border-accent-foreground/65 px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground">
            {copy.cta ?? t('lessons.signupCta')}
          </span>
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
