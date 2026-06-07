import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { RegistrationStatus as RegistrationStatusValue } from "@/lib/product-api";

const statusIcon = {
	pending: Clock3,
	approved: CheckCircle2,
	rejected: XCircle,
	cancelled: XCircle,
} satisfies Record<RegistrationStatusValue, typeof Clock3>;

export function RegistrationStatus({ status }: { status: RegistrationStatusValue }) {
	const { t } = useTranslation();
	const Icon = statusIcon[status];

	return (
		<span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 font-display text-xs font-bold uppercase text-accent-foreground">
			<Icon className="size-3.5" />
			{t(`productShell.classes.registrationStatus.${status}`)}
		</span>
	);
}
