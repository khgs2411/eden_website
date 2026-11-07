import { useTranslation } from 'react-i18next'

// Same order as the lesson groups above (Vogue first), so the page reads top to bottom.
const fitStyles = ['vogue', 'hipHop'] as const

// "Who is this for?": an always-visible typographic spread. Each style gets an outlined
// poster word (echoing the offer tiles' numerals), an accent bar, a lead line, and the rest of the copy.
export function LessonFit() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="lesson-fit-title" className="mt-16">
      <h2
        id="lesson-fit-title"
        className="mb-10 text-center font-display text-[1.65rem] font-bold uppercase leading-none tracking-[0.28em]"
      >
        {t('lessons.fitCta')}
      </h2>

      <div className="grid md:grid-cols-2">
        {fitStyles.map((style, index) => {
          const [lead, ...rest] = t(`lessons.fit.${style}.body`).split('\n')

          return (
            <article
              key={style}
              className={`group text-start ${index > 0 ? 'mt-10 border-t border-accent-foreground/25 pt-10 md:mt-0 md:border-s md:border-t-0 md:ps-8 md:pt-0' : 'md:pe-8'}`}
            >
              <h3
                className="whitespace-nowrap font-display text-6xl font-bold uppercase leading-none text-transparent transition-colors duration-500 [-webkit-text-stroke:1.5px_var(--accent-foreground)] group-hover:text-accent-foreground lg:text-7xl"
              >
                {t(`lessons.fit.${style}.title`)}
              </h3>
              <span aria-hidden="true" className="mt-5 block h-0.5 w-12 bg-accent-foreground" />
              <p className="mt-5 font-display text-lg font-bold leading-snug text-foreground/92">{lead}</p>
              {rest.length > 0 && (
                <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-muted-foreground lg:text-[0.95rem]">{rest.join('\n')}</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
