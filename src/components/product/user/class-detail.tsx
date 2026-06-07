import { CalendarClock, MapPin, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RegistrationStatus } from "@/components/product/user/registration-status";
import { Button } from "@/components/ui/button";
import type { UserClassSummary } from "@/lib/product-api";

function formatDateTimeRange(startsAt: string, endsAt: string, language: string) {
	const locale = language === "he" ? "he-IL" : language === "ru" ? "ru-RU" : "en-US";
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	return `${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(start)} - ${new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(end)}`;
}

export function ClassDetail({
	selectedClass,
	actionPending,
	message,
	onRegister,
	onCancel,
}: {
	selectedClass: UserClassSummary | null;
	actionPending: boolean;
	message: string | null;
	onRegister: (classId: string) => void;
	onCancel: (registrationId: string) => void;
}) {
	const { i18n, t } = useTranslation();

	if (!selectedClass) {
		return (
			<div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
				{t("productShell.classes.selectPrompt")}
			</div>
		);
	}

	const registration = selectedClass.user_registration;
	const canCancel = registration?.status === "pending" || registration?.status === "approved";

	return (
		<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-display text-xs font-bold uppercase text-accent-foreground">{selectedClass.category ?? t("productShell.classes.defaultCategory")}</p>
					<h3 className="mt-1 font-display text-2xl font-bold uppercase">{selectedClass.name}</h3>
				</div>
				{registration ? <RegistrationStatus status={registration.status} /> : null}
			</div>

			{selectedClass.description ? <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{selectedClass.description}</p> : null}

			<div className="mt-4 grid gap-2 text-sm">
				<p className="flex items-center gap-2">
					<CalendarClock className="size-4 text-accent-foreground" />
					{formatDateTimeRange(selectedClass.starts_at, selectedClass.ends_at, i18n.resolvedLanguage ?? i18n.language)}
				</p>
				<p className="flex items-center gap-2">
					<MapPin className="size-4 text-accent-foreground" />
					{selectedClass.location ?? t("productShell.classes.locationTbd")}
				</p>
				<p className="flex items-center gap-2">
					<Ticket className="size-4 text-accent-foreground" />
					{t("productShell.classes.capacity", {
						approved: selectedClass.approved_count ?? 0,
						capacity: selectedClass.capacity,
					})}
				</p>
			</div>

			<div className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
				{t(`productShell.classes.membershipMessages.${selectedClass.membership_requirement}`)}
				{" "}
				{t(`productShell.classes.policyMessages.${selectedClass.registration_policy}`)}
			</div>

			{message ? <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}

			<div className="mt-4 flex flex-wrap gap-2">
				{canCancel && registration ? (
					<Button type="button" variant="outline" onClick={() => onCancel(registration.id)} disabled={actionPending}>
						{actionPending ? t("productShell.classes.actions.working") : t("productShell.classes.actions.cancel")}
					</Button>
				) : (
					<Button type="button" onClick={() => onRegister(selectedClass.id)} disabled={actionPending || Boolean(registration)}>
						{actionPending ? t("productShell.classes.actions.working") : t("productShell.classes.actions.register")}
					</Button>
				)}
			</div>
		</div>
	);
}
