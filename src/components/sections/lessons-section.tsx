import { useTranslation } from 'react-i18next'

import { LessonCard } from '@/components/lessons/lesson-card'
import { LessonFit } from '@/components/lessons/lesson-fit'
import { LessonVideos } from '@/components/lessons/lesson-videos'
import { lessonGroups } from '@/data/site'

export function LessonsSection() {
  const { t } = useTranslation()

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

        <LessonFit />
      </div>
    </section>
  )
}
