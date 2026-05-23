import { useTranslation } from 'react-i18next'

type VoguePricingViewProps = {
  onBack: () => void
}

const rows = ['trial', 'single', 'card8', 'card12', 'card16'] as const

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="17.5" height="17.5" x="3.25" y="3.25" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function VoguePricingView({ onBack }: VoguePricingViewProps) {
  const { t } = useTranslation()

  return (
    <section className="min-h-screen bg-background px-6 pb-16 pt-24 text-foreground">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          className="mb-8 font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-foreground transition hover:text-foreground"
          onClick={onBack}
        >
          {t('voguePricing.back')}
        </button>

        <div className="rounded-md border border-border/80 bg-card/80 p-6 text-center shadow-[0_22px_70px_rgba(0,0,0,0.18)] backdrop-blur">
          <p className="font-display text-xs font-bold uppercase tracking-[0.34em] text-muted-foreground">
            Vogue New Way
          </p>
          <h1 className="mx-auto mt-4 inline-block border-b-2 border-accent-foreground pb-1 font-display text-[2rem] font-bold uppercase leading-tight tracking-[0.04em] text-foreground">
            {t('voguePricing.title')}
          </h1>

          <div className="mt-8 space-y-2 font-display text-xl font-bold tracking-[0.08em] text-foreground/92">
            <p>{t('voguePricing.schedule')}</p>
            <p className="text-base text-muted-foreground">{t('voguePricing.duration')}</p>
          </div>

          <div className="mt-10 overflow-hidden rounded-md border border-border/90">
            <div className="grid grid-cols-[1.2fr_0.75fr_0.9fr_1fr] border-b border-border/90 bg-muted/35 font-display text-sm font-bold uppercase tracking-[0.08em] text-foreground">
              <span className="border-e border-border/90 px-2 py-3">{t('voguePricing.table.entry')}</span>
              <span className="border-e border-border/90 px-2 py-3">{t('voguePricing.table.quantity')}</span>
              <span className="border-e border-border/90 px-2 py-3">{t('voguePricing.table.price')}</span>
              <span className="px-2 py-3">{t('voguePricing.table.validity')}</span>
            </div>
            {rows.map((row) => (
              <div
                key={row}
                className="grid grid-cols-[1.2fr_0.75fr_0.9fr_1fr] border-b border-border/70 text-sm font-bold last:border-b-0"
              >
                <span className="whitespace-pre-line border-e border-border/70 px-2 py-3">
                  {t(`voguePricing.rows.${row}.entry`)}
                </span>
                <span className="border-e border-border/70 px-2 py-3">{t(`voguePricing.rows.${row}.quantity`)}</span>
                <span className="border-e border-border/70 px-2 py-3">{t(`voguePricing.rows.${row}.price`)}</span>
                <span className="px-2 py-3">{t(`voguePricing.rows.${row}.validity`)}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-2 text-sm font-bold leading-7 text-muted-foreground">
            <p>{t('voguePricing.location')}</p>
            <a
              href="https://www.instagram.com/edendafna?utm_source=qr&igsh=MW5scHlmMDB4ZmkyZw=="
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-accent-foreground/65 px-4 py-2 font-display text-base font-bold uppercase tracking-[0.1em] transition hover:border-accent-foreground hover:bg-accent-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ color: 'var(--accent-foreground)' }}
            >
              {t('voguePricing.registration')}
              <InstagramIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
