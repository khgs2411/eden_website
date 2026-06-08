import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import type { RegistrationStatus as RegistrationStatusValue } from "../../types";

export type RegistrationStatusLabels = Partial<Record<RegistrationStatusValue, string>>;

const defaultLabels = {
	pending: "Pending",
	approved: "Approved",
	rejected: "Rejected",
	cancelled: "Cancelled",
} satisfies Record<RegistrationStatusValue, string>;

const statusIcon = {
	pending: Clock3,
	approved: CheckCircle2,
	rejected: XCircle,
	cancelled: XCircle,
} satisfies Record<RegistrationStatusValue, typeof Clock3>;

export function RegistrationStatus({ status, labels: labelOverrides }: { status: RegistrationStatusValue; labels?: RegistrationStatusLabels }) {
	const labels = { ...defaultLabels, ...labelOverrides };
	const Icon = statusIcon[status];

	return (
		<span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-display text-xs font-bold uppercase text-accent-foreground">
			<Icon className="size-3.5" />
			{labels[status]}
		</span>
	);
}
