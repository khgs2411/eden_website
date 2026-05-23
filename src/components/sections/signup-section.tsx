import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function SignupSection() {
  const { t } = useTranslation()

  return (
    <section id="signup" className="bg-background px-5 pb-20 pt-16">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.38em] text-muted-foreground">
            {t('signup.eyebrow')}
          </p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-[0.08em] sm:text-5xl">
            {t('signup.title')}
          </h2>
          <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">{t('signup.body')}</p>
        </div>

        <form className="grid gap-5 rounded-md border border-border bg-card/80 p-5 shadow-sm">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('signup.name')}</Label>
            <Input id="name" name="name" placeholder={t('signup.namePlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">{t('signup.email')}</Label>
            <Input id="email" name="email" type="email" placeholder={t('signup.emailPlaceholder')} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">{t('signup.notes')}</Label>
            <Textarea id="notes" name="notes" placeholder={t('signup.notesPlaceholder')} />
          </div>
          <Button type="button" size="lg" className="font-display text-sm font-black uppercase tracking-[0.08em]">
            {t('signup.submit')}
          </Button>
        </form>
      </div>
    </section>
  )
}
