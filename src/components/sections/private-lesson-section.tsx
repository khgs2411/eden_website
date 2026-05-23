import { useTranslation } from 'react-i18next'

export function PrivateLessonSection() {
  const { t } = useTranslation()
  const assetBase = import.meta.env.BASE_URL
  const paragraphs = t('about.body').split('\n\n')

  return (
    <section
      id="private-lesson"
      className="relative min-h-[430px] overflow-hidden px-7 pb-14 pt-8 text-foreground dark:text-white"
    >
      <img
        src={`${assetBase}assets/image_2.jpg`}
        alt=""
        className="absolute inset-0 size-full object-cover object-[42%_center] grayscale lg:object-[50%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,rgba(250,248,245,0.12)_18%,rgba(250,248,245,0.03)_58%,var(--background)_100%),linear-gradient(90deg,var(--background)_0%,rgba(250,248,245,0.34)_28%,rgba(250,248,245,0.02)_68%)] dark:bg-[linear-gradient(180deg,var(--background)_0%,rgba(0,0,0,0.2)_18%,rgba(0,0,0,0.06)_58%,var(--background)_100%),linear-gradient(90deg,var(--background)_0%,rgba(0,0,0,0.56)_28%,rgba(0,0,0,0.06)_68%)]" />

      <div className="relative z-10 flex min-h-[300px] flex-col justify-between gap-10">
        <h2 className="max-w-[13rem] font-display text-[4.25rem] font-bold uppercase leading-[0.9] tracking-[-0.035em] lg:text-[3.55rem]">
          {t('about.title')}
        </h2>
        <div className="max-w-[20rem] space-y-5 rtl:text-right">
          <div className="space-y-4 text-sm font-semibold leading-7 text-foreground/92 dark:text-white/88">
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
          <a
            href="#lessons"
            className="inline-flex rounded-sm border border-accent-foreground/65 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.1em] text-accent-foreground shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur transition hover:-translate-y-0.5 hover:border-accent-foreground hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('about.registrationCard.cta')}
          </a>
        </div>
      </div>
    </section>
  )
}
