import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRef, useState, type FocusEvent } from 'react'

import { LessonCard } from '@/components/lessons/lesson-card'
import { lessons, type Lesson } from '@/data/site'

type LessonsSectionProps = {
  onLessonSelect?: (lesson: Lesson) => void
}

export function LessonsSection({ onLessonSelect }: LessonsSectionProps) {
  const { t } = useTranslation()
  const [fitOpen, setFitOpen] = useState(false)
  const fitRef = useRef<HTMLDivElement>(null)

  function handleFitBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null
    if (!fitRef.current?.contains(nextTarget)) setFitOpen(false)
  }

  return (
    <section id="lessons" className="relative z-20 -mt-72 bg-transparent px-6 pb-14 pt-20 lg:-mt-56 lg:px-12">
      <div className="mx-auto max-w-md lg:max-w-2xl">
        <div className="mb-8 text-center">
          <h2 className="font-display text-[1.65rem] font-bold uppercase leading-none tracking-[0.28em]">
            {t('lessons.title')}
          </h2>
        </div>

        <div className="grid gap-2.5 lg:gap-4">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} onSelect={onLessonSelect} />
          ))}
        </div>

        <div ref={fitRef} className="mt-5" onBlur={handleFitBlur}>
          <button
            type="button"
            className="mx-auto flex items-center gap-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground transition hover:text-foreground"
            aria-expanded={fitOpen}
            aria-controls="lesson-fit-panel"
            onClick={() => setFitOpen((current) => !current)}
          >
            <span>{t('lessons.fitCta')}</span>
            <span
              className={`inline-flex size-5 shrink-0 origin-center items-center justify-center transition-transform duration-200 ${fitOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <ChevronDown className="size-4 translate-y-[3px]" strokeWidth={2.4} />
            </span>
          </button>

          {fitOpen && (
            <div
              id="lesson-fit-panel"
              className="mt-4 grid gap-4 rounded-md border border-border/80 bg-card/80 p-4 text-start shadow-[0_16px_48px_rgba(0,0,0,0.12)] backdrop-blur animate-in fade-in slide-in-from-top-2 duration-300 md:grid-cols-2"
            >
              <article className="border-border/70 md:border-e md:pe-4">
                <h3 className="font-display text-xl font-bold uppercase tracking-[0.12em] text-accent-foreground">
                  {t('lessons.fit.hipHop.title')}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm font-bold leading-7 text-muted-foreground">
                  {t('lessons.fit.hipHop.body')}
                </p>
              </article>
              <article>
                <h3 className="font-display text-xl font-bold uppercase tracking-[0.12em] text-accent-foreground">
                  {t('lessons.fit.vogue.title')}
                </h3>
                <p className="mt-3 whitespace-pre-line text-sm font-bold leading-7 text-muted-foreground">
                  {t('lessons.fit.vogue.body')}
                </p>
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
