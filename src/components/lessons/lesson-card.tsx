import { useTranslation } from 'react-i18next'

import type { Lesson } from '@/data/site'

type LessonCardProps = {
  lesson: Lesson
  onSelect?: (lesson: Lesson) => void
}

export function LessonCard({ lesson, onSelect }: LessonCardProps) {
  const { t } = useTranslation()
  const dayLabel = [t('lessons.dayPrefix'), t(`days.${lesson.day}`)].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[8.9rem_1fr_max-content] items-stretch rounded-md border border-border/80 bg-card/82 px-3.5 py-3 text-start shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md dark:bg-card/35"
      onClick={() => onSelect?.(lesson)}
    >
      <span className="flex flex-col justify-center border-e border-border pe-3 font-display uppercase">
        <span className="block whitespace-nowrap text-[1.25rem] font-bold leading-none tracking-[0.08em]">
          {dayLabel}
        </span>
      </span>
      <span className="grid items-center gap-1 ps-4">
        <span className="text-[0.78rem] text-foreground/85">{lesson.time}</span>
        <span className="font-display text-lg font-bold uppercase tracking-[0.08em] text-foreground/92">
          {lesson.style}
        </span>
      </span>
      <span className="flex items-center justify-end ps-3">
        <span className="rounded-sm border border-accent-foreground/65 px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground">
          {t('lessons.signupCta')}
        </span>
      </span>
    </button>
  )
}
