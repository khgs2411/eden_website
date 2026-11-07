type MarqueeProps = {
  items: readonly string[]
  className?: string
}

// A horizontally looping band of words. The list is rendered twice so the -50% animation loops
// seamlessly; the copy is aria-hidden so screen readers hear it once.
export function Marquee({ items, className }: MarqueeProps) {
  const row = (hidden: boolean) => (
    <span className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-4">{item}</span>
          <span className="text-accent-foreground" aria-hidden="true">
            ✦
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div className={`overflow-hidden ${className ?? ''}`} dir="ltr">
      <div className="marquee-x flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
