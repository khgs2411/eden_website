import { useTranslation } from 'react-i18next'

import { LessonCard } from '@/components/lessons/lesson-card'
import { LessonFit } from '@/components/lessons/lesson-fit'
import { LessonNotice } from '@/components/lessons/lesson-notice'
import { LessonVideos } from '@/components/lessons/lesson-videos'
import { Marquee } from '@/components/ui/marquee'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'
import { lessonGroups } from '@/data/site'

// Untranslated style terms, so the band reads the same in every language.
const marqueeItems = ['VOGUE NEW WAY', 'HIP-HOP', 'BALLROOM', 'WORKSHOPS'] as const

export function LessonsSection() {
  const { t } = useTranslation()

  return (
    <section id="lessons" className="relative z-20 -mt-36 bg-transparent pb-16 pt-6">
      <Marquee
        items={marqueeItems}
        className="-mx-4 -rotate-2 border-y border-accent-foreground/40 bg-background/80 py-2.5 font-display text-sm font-bold uppercase tracking-[0.3em] text-foreground/80 backdrop-blur"
      />

      <div className="mt-14 grid gap-16 px-5">
        {lessonGroups.map((group, groupIndex) => {
          const groupTitle = t(`lessons.groups.${group.id}`)

          return (
            <div key={group.id} id={`group-${group.id}`} className="scroll-mt-20">
              <Reveal>
                <SectionHeading index={groupIndex + 1} title={groupTitle} />
              </Reveal>
              <div className="grid gap-3.5">
                {group.lessons.map((lesson, index) => (
                  <Reveal key={lesson.id} delay={index * 80}>
                    <LessonCard lesson={lesson} index={index} />
                  </Reveal>
                ))}
              </div>
              {'notice' in group && (
                <Reveal>
                  <LessonNotice copy={group.notice.copy} href={group.notice.href} />
                </Reveal>
              )}
              <LessonVideos
                id={group.id}
                label={t(`lessons.videosCtaOverrides.${group.id}`, { defaultValue: t('lessons.videosCta', { title: groupTitle }) })}
                videos={group.videos}
              />
            </div>
          )
        })}

        <LessonFit index={lessonGroups.length + 1} />
      </div>
    </section>
  )
}
