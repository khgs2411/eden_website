import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type CollapsibleToggleProps = {
	open: boolean;
	controls: string;
	onToggle: () => void;
	children: ReactNode;
};

export function CollapsibleToggle({ open, controls, onToggle, children }: CollapsibleToggleProps) {
	return (
		<button
			type="button"
			className="mx-auto flex items-center gap-2.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-accent-foreground transition hover:text-foreground"
			aria-expanded={open}
			aria-controls={controls}
			onClick={onToggle}>
			<span>{children}</span>
			<span
				className={`inline-flex size-5 shrink-0 origin-center items-center justify-center transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				aria-hidden="true">
				<ChevronDown className="size-4 translate-y-[3px]" strokeWidth={2.4} />
			</span>
		</button>
	);
}
