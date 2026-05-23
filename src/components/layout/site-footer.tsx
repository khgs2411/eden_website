import { Music2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="17.5" height="17.5" x="3.25" y="3.25" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 8.4V6.9c0-.72.48-.9.82-.9H17V2.25L14 2.24c-3.33 0-4.08 2.5-4.08 4.09V8.4H7.3v3.86h2.62V22h4.08v-9.74h3.05l.4-3.86H14Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border/75 px-5 py-5">
      <div className="mx-auto flex max-w-md items-center justify-center gap-5 text-center lg:max-w-[740px]">
        <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t('footer.socialPrompt')}
        </p>
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/edendafna?utm_source=qr&igsh=MW5scHlmMDB4ZmkyZw=="
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-accent-foreground/45 text-accent-foreground transition hover:border-accent-foreground hover:bg-accent-foreground hover:text-background"
            aria-label={t('footer.instagram')}
          >
            <InstagramIcon className="size-4" />
          </a>
          <a
            href="https://www.tiktok.com/@eden.dafna?_r=1&_t=ZS-96bDqVrnEMJ"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-accent-foreground/45 text-accent-foreground transition hover:border-accent-foreground hover:bg-accent-foreground hover:text-background"
            aria-label={t('footer.tiktok')}
          >
            <Music2 className="size-4" />
          </a>
          <a
            href="https://www.facebook.com/share/1HuyxoqRKk/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-accent-foreground/45 text-accent-foreground transition hover:border-accent-foreground hover:bg-accent-foreground hover:text-background"
            aria-label={t('footer.facebook')}
          >
            <FacebookIcon className="size-4" />
          </a>
        </div>
      </div>
    </footer>
  )
}
