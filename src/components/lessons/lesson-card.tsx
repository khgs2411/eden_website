import { useTranslation } from 'react-i18next'

import { instagramUrl, type Lesson } from '@/data/site'

type LessonCardProps = {
  lesson: Lesson
  onSelect?: (lesson: Lesson) => void
}

export function LessonCard({ lesson, onSelect }: LessonCardProps) {
  const { t } = useTranslation()

  if (!('style' in lesson)) {
    return (
      <a
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        className="grid w-full grid-cols-[1fr_max-content] items-stretch rounded-md border border-border/80 bg-card/82 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 lg:h-[5.75rem] lg:grid-cols-[8.9rem_minmax(0,1fr)_max-content] lg:px-3.5 lg:py-3"
      >
        <span className="flex flex-col justify-center px-4 py-3 font-display uppercase lg:border-e lg:border-border lg:px-0 lg:py-0 lg:pe-3">
          <span className="block text-[1rem] font-bold leading-tight tracking-[0.08em] lg:text-[1.25rem] lg:leading-none">
            {t('lessons.contactCard.label')}
          </span>
        </span>
        <span className="hidden min-w-0 content-center gap-1 px-4 lg:grid lg:px-0 lg:ps-4">
          <span className="font-display text-lg font-bold uppercase tracking-[0.08em] text-foreground/92">
            {t('lessons.contactCard.title')}
          </span>
          <span className="whitespace-pre-line text-sm font-bold leading-5 text-muted-foreground">
            {t('lessons.contactCard.body')}
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

  const regularLesson = lesson
  const dayLabel = [t('lessons.dayPrefix'), t(`days.${regularLesson.day}`)].filter(Boolean).join(' ')
  const styleSubtitle =
    regularLesson.styleSubtitle === 'women' ? t('lessonStyleSubtitles.women') : regularLesson.styleSubtitle

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[1fr_max-content] items-stretch rounded-md border border-border/80 bg-card/82 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35 lg:h-[5.75rem] lg:grid-cols-[8.9rem_minmax(0,1fr)_max-content] lg:px-3.5 lg:py-3"
      onClick={() => onSelect?.(regularLesson)}
    >
      <span className="flex flex-col justify-center px-4 py-3 font-display uppercase lg:border-e lg:border-border lg:px-0 lg:py-0 lg:pe-3">
        <span className="block text-[1rem] font-bold leading-tight tracking-[0.08em] lg:text-[1.25rem] lg:leading-none">
          <span className="lg:hidden">
            {dayLabel} - {regularLesson.style}{' '}
            <span className="text-[0.72rem] tracking-[0.12em] text-muted-foreground">{styleSubtitle}</span>
          </span>
          <span className="hidden lg:block">{dayLabel}</span>
        </span>
        <span className="mt-1 block whitespace-nowrap text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground">
          <span className="lg:hidden">
            {t(`locations.${regularLesson.location}`)} - {regularLesson.time.replace(/\s+-\s+/, '-')}
          </span>
          <span className="hidden lg:block">
            {t(`locations.${regularLesson.location}`)}
          </span>
        </span>
      </span>
      <span className="hidden min-w-0 content-center gap-1 px-4 lg:grid lg:px-0 lg:ps-4">
        <span className="hidden font-display text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground lg:block">
          {regularLesson.time}
        </span>
        <span className="font-display text-lg font-bold uppercase tracking-[0.08em] text-foreground/92">
          {regularLesson.style}
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
    </button>
  )
}
