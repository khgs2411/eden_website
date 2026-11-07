type SectionHeadingProps = {
  index: number
  title: string
  id?: string
}

// Editorial section opener: a small accent index ("01 —"), a big display title, and a fading rule.
export function SectionHeading({ index, title, id }: SectionHeadingProps) {
  return (
    <header className="mb-7">
      <span className="font-display text-xs font-bold tracking-[0.3em] text-accent-foreground">
        {String(index).padStart(2, '0')} —
      </span>
      <h2 id={id} className="mt-2 font-display text-[2.1rem] font-bold uppercase leading-[0.95] tracking-[0.02em]">
        {title}
      </h2>
      <span aria-hidden="true" className="mt-5 block h-px bg-linear-to-l from-transparent via-foreground/25 to-foreground/25 rtl:bg-linear-to-r" />
    </header>
  )
}
