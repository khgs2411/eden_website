import { useTranslation } from 'react-i18next'

import { LessonCard } from '@/components/lessons/lesson-card'
import { lessons, type Lesson } from '@/data/site'

type LessonsSectionProps = {
  onLessonSelect?: (lesson: Lesson) => void
}

export function LessonsSection({ onLessonSelect }: LessonsSectionProps) {
  const { t } = useTranslation()

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
      </div>
    </section>
  )
}
