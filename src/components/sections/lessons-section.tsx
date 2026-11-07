import { useTranslation } from 'react-i18next'
import { useRef, useState, type FocusEvent } from 'react'

import { LessonCard } from '@/components/lessons/lesson-card'
import { LessonVideos } from '@/components/lessons/lesson-videos'
import { CollapsibleToggle } from '@/components/ui/collapsible-toggle'
import { lessonGroups } from '@/data/site'

export function LessonsSection() {
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
        <div className="grid gap-12">
          {lessonGroups.map((group) => {
            const groupTitle = t(`lessons.groups.${group.id}`)
            // A group made only of offer tiles sits two-up on desktop; schedule cards stay one per row.
            const offersOnly = group.lessons.every((lesson) => 'kind' in lesson)

            return (
              <div key={group.id}>
                <h2 className="mb-8 text-center font-display text-[1.65rem] font-bold uppercase leading-none tracking-[0.28em]">
                  {groupTitle}
                </h2>
                <div className={offersOnly ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-2.5 lg:gap-4'}>
                  {group.lessons.map((lesson, index) => (
                    <LessonCard key={lesson.id} lesson={lesson} index={index} />
                  ))}
                </div>
                <LessonVideos id={group.id} label={t(`lessons.videosCtaOverrides.${group.id}`, { defaultValue: t('lessons.videosCta', { title: groupTitle }) })} videos={group.videos} />
              </div>
            )
          })}
        </div>

        <div ref={fitRef} className="mt-5" onBlur={handleFitBlur}>
          <CollapsibleToggle open={fitOpen} controls="lesson-fit-panel" onToggle={() => setFitOpen((current) => !current)}>
            {t('lessons.fitCta')}
          </CollapsibleToggle>

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
