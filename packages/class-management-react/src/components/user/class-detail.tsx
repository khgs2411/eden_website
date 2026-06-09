import { CalendarClock, MapPin, Ticket } from "lucide-react";

import type { RegistrationPolicy, MembershipRequirement, UserClassSummary } from "../../types";
import { useClassManagementUi } from "../../ui/ui-adapter";
import { RegistrationStatus, type RegistrationStatusLabels } from "./registration-status";

export type ClassDetailLabels = {
	selectPrompt?: string;
	defaultCategory?: string;
	locationTbd?: string;
	capacity?: (approved: number, capacity: number) => string;
	membershipMessages?: Partial<Record<MembershipRequirement, string>>;
	policyMessages?: Partial<Record<RegistrationPolicy, string>>;
	actions?: {
		register?: string;
		cancel?: string;
		cancellationClosed?: string;
		working?: string;
	};
	registrationStatus?: RegistrationStatusLabels;
};

const defaultMembershipMessages = {
	none: "No membership is required.",
	required: "Active membership is required.",
} satisfies Record<MembershipRequirement, string>;

const defaultPolicyMessages = {
	auto_approve: "Registration is approved automatically.",
	member_auto_approve: "Members are approved automatically.",
	approval_required: "Registration requires approval.",
} satisfies Record<RegistrationPolicy, string>;

const defaultLabels = {
	selectPrompt: "Select a class to view details.",
	defaultCategory: "Class",
	locationTbd: "Location to be announced",
	capacity: (approved: number, capacity: number) => `${approved} / ${capacity} seats approved`,
	actions: {
		register: "Register",
		cancel: "Cancel registration",
		cancellationClosed: "Cancellation is closed for this class.",
		working: "Working...",
	},
} satisfies Omit<Required<ClassDetailLabels>, "membershipMessages" | "policyMessages" | "registrationStatus">;

function formatDateTimeRange(startsAt: string, endsAt: string) {
	const start = new Date(startsAt);
	const end = new Date(endsAt);

	return `${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(start)} - ${new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(end)}`;
}

export function ClassDetail({
	selectedClass,
	actionPending,
	message,
	onRegister,
	onCancel,
	labels: labelOverrides,
}: {
	selectedClass: UserClassSummary | null;
	actionPending: boolean;
	message: string | null;
	onRegister: (classId: string) => void;
	onCancel: (registrationId: string) => void;
	labels?: ClassDetailLabels;
}) {
	const { Button } = useClassManagementUi();
	const labels = {
		...defaultLabels,
		...labelOverrides,
		actions: { ...defaultLabels.actions, ...labelOverrides?.actions },
		membershipMessages: { ...defaultMembershipMessages, ...labelOverrides?.membershipMessages },
		policyMessages: { ...defaultPolicyMessages, ...labelOverrides?.policyMessages },
	};

	if (!selectedClass) {
		return <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">{labels.selectPrompt}</div>;
	}

	const registration = selectedClass.user_registration;
	const hasLiveRegistration = registration?.status === "pending" || registration?.status === "approved";
	const canCancel = hasLiveRegistration && selectedClass.can_cancel_registration;

	return (
		<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<p className="font-display text-xs font-bold uppercase text-accent-foreground">{selectedClass.category ?? labels.defaultCategory}</p>
					<h3 className="mt-1 font-display text-2xl font-bold uppercase">{selectedClass.name}</h3>
				</div>
				{registration ? <RegistrationStatus status={registration.status} labels={labelOverrides?.registrationStatus} /> : null}
			</div>

			{selectedClass.description ? <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{selectedClass.description}</p> : null}

			<div className="mt-4 grid gap-2 text-sm">
				<p className="flex items-center gap-2">
					<CalendarClock className="size-4 text-accent-foreground" />
					{formatDateTimeRange(selectedClass.starts_at, selectedClass.ends_at)}
				</p>
				<p className="flex items-center gap-2">
					<MapPin className="size-4 text-accent-foreground" />
					{selectedClass.location ?? labels.locationTbd}
				</p>
				<p className="flex items-center gap-2">
					<Ticket className="size-4 text-accent-foreground" />
					{labels.capacity(selectedClass.approved_count ?? 0, selectedClass.capacity)}
				</p>
			</div>

			<div className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
				{labels.membershipMessages[selectedClass.membership_requirement]} {labels.policyMessages[selectedClass.registration_policy]}
			</div>

			{message ? <p className="mt-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}

			<div className="mt-4 flex flex-wrap gap-2">
				{hasLiveRegistration && registration ? (
					canCancel ? (
						<Button type="button" variant="outline" onClick={() => onCancel(registration.id)} disabled={actionPending}>
							{actionPending ? labels.actions.working : labels.actions.cancel}
						</Button>
					) : (
						<Button type="button" variant="outline" disabled>
							{labels.actions.cancellationClosed}
						</Button>
					)
				) : (
					<Button type="button" onClick={() => onRegister(selectedClass.id)} disabled={actionPending || Boolean(registration)}>
						{actionPending ? labels.actions.working : labels.actions.register}
					</Button>
				)}
			</div>
		</div>
	);
}
