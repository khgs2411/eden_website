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
        </div>
      </div>
      <div className="relative z-10 mt-12">
        <div className="mx-auto grid max-w-[52rem] overflow-hidden rounded-md border border-border/75 bg-card/88 text-foreground shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-md dark:border-white/10 dark:bg-[#201729]/92 dark:text-white lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="flex items-center justify-center border-b border-border/75 px-6 py-7 dark:border-white/10 lg:border-b-0 lg:border-e">
            <a
              href="#lessons"
              className="inline-flex min-h-14 max-w-full items-center justify-center rounded-md border border-accent-foreground/40 px-7 py-3 text-center font-display text-base font-bold uppercase tracking-[0.12em] text-accent-foreground transition hover:-translate-y-0.5 hover:border-accent-foreground hover:bg-accent-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t('about.registrationCard.cta')}
            </a>
          </div>
          <div className="px-7 py-7 text-center lg:px-10 lg:py-8">
            <h3 className="font-display text-4xl font-bold leading-tight text-foreground/95 dark:text-white lg:text-5xl">
              {t('about.registrationCard.title')}
            </h3>
            <p className="mt-4 text-2xl font-bold leading-snug text-muted-foreground dark:text-white/72">
              {t('about.registrationCard.body')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
