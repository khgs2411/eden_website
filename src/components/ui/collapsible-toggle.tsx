import { ChevronDown, Play } from "lucide-react";
import type { ReactNode } from "react";

type CollapsibleToggleProps = {
	open: boolean;
	controls: string;
	onToggle: () => void;
	children: ReactNode;
	/** Optional item count shown as a small badge (e.g. number of videos). */
	count?: number;
};

// "Play reel" pill: accent play disc, label, optional count, and a chevron that flips when open.
export function CollapsibleToggle({ open, controls, onToggle, children, count }: CollapsibleToggleProps) {
	return (
		<button
			type="button"
			className="group mx-auto flex w-full items-center gap-3 rounded-full border border-accent-foreground/35 bg-accent-foreground/5 py-1.5 ps-1.5 pe-4 text-start transition hover:border-accent-foreground hover:bg-accent-foreground/10"
			aria-expanded={open}
			aria-controls={controls}
			onClick={onToggle}
		>
			<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-foreground text-background transition-transform group-hover:scale-105" aria-hidden="true">
				<Play className="size-4 translate-x-px fill-current" />
			</span>
			<span className="min-w-0 flex-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-accent-foreground">{children}</span>
			{count !== undefined && (
				<span className="font-display text-xs font-bold tracking-[0.1em] text-muted-foreground" aria-hidden="true">
					{count}
				</span>
			)}
			<span className={`inline-flex size-5 shrink-0 items-center justify-center text-accent-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
				<ChevronDown className="size-4" strokeWidth={2.4} />
			</span>
		</button>
	);
}
