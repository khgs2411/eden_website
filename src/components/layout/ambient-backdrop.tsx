// Desktop only: the site is a phone-width column, so the empty space either side becomes a slow,
// vertical poster of outlined style names. Purely decorative.
const words = ['VOGUE NEW WAY', 'HIP-HOP', 'BALLROOM', 'EDEN DAFNA'] as const

function Column({ reverse }: { reverse?: boolean }) {
  const stack = (
    <div className="flex flex-col items-center gap-10 py-5">
      {words.map((word) => (
        <span key={word} className="text-outline-muted font-display text-[7rem] font-bold uppercase leading-none [writing-mode:vertical-rl]">
          {word}
        </span>
      ))}
    </div>
  )

  return (
    <div className="h-full overflow-hidden">
      <div className="marquee-y" style={reverse ? { animationDirection: 'reverse' } : undefined}>
        {stack}
        {stack}
      </div>
    </div>
  )
}

export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden justify-between px-[4vw] lg:flex">
      <Column />
      <Column reverse />
    </div>
  )
}
