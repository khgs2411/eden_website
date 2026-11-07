import { ArrowRight, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type LessonNoticeProps = {
  copy: string
  href: string
}

// A quiet aside under a group's cards: dashed outline (not a card), icon, line of copy, and a link.
// Deliberately lighter than the tickets so it reads as a footnote, not another offer.
export function LessonNotice({ copy, href }: LessonNoticeProps) {
  const { t } = useTranslation()

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group mt-3.5 flex items-start gap-3 rounded-xl border border-dashed border-accent-foreground/45 px-4 py-3.5 text-start transition hover:border-accent-foreground hover:bg-accent-foreground/5"
    >
      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-foreground/15 text-accent-foreground" aria-hidden="true">
        <MessageCircle className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block whitespace-pre-line text-sm font-semibold leading-6 text-foreground/80">{t(`lessons.notices.${copy}.body`)}</span>
        <span className="mt-1 inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground">
          {t(`lessons.notices.${copy}.cta`)}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" strokeWidth={2.4} aria-hidden="true" />
        </span>
      </span>
    </a>
  )
}
