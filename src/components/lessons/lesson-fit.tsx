import { useTranslation } from 'react-i18next'

import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/section-heading'

// Same order as the lesson groups above (Vogue first), so the page reads top to bottom.
const fitStyles = ['vogue', 'hipHop'] as const

type LessonFitProps = {
  index: number
}

// "Who is this for?": an always-visible typographic spread. Each style gets an outlined
// poster word (echoing the offer tiles' numerals), an accent bar, a lead line, and the rest of the copy.
export function LessonFit({ index }: LessonFitProps) {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="lesson-fit-title">
      <Reveal>
        <SectionHeading index={index} title={t('lessons.fitCta')} id="lesson-fit-title" />
      </Reveal>

      <div className="grid gap-12">
        {fitStyles.map((style) => {
          const [lead, ...rest] = t(`lessons.fit.${style}.body`).split('\n')

          return (
            <Reveal key={style}>
              <article className="group text-start">
                <h3 className="text-outline whitespace-nowrap font-display text-[4.25rem] font-bold uppercase leading-none transition-colors duration-500 group-hover:text-accent-foreground">
                  {t(`lessons.fit.${style}.title`)}
                </h3>
                <span aria-hidden="true" className="mt-5 block h-0.5 w-12 bg-accent-foreground" />
                <p className="mt-5 font-display text-lg font-bold leading-snug text-foreground/92">{lead}</p>
                {rest.length > 0 && <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-muted-foreground">{rest.join('\n')}</p>}
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
