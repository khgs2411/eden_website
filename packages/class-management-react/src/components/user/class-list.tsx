import { CalendarDays, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { cancelClassRegistration, listUserClasses, registerForClass } from "../../client/product-api";
import { useProductContext } from "../../context/product-context-state";
import type { ClassRegistrationResponse, RegistrationStatus as RegistrationStatusValue, UserClassSummary } from "../../types";
import { useClassManagementUi } from "../../ui/ui-adapter";
import { ClassDetail, type ClassDetailLabels } from "./class-detail";
import { RegistrationStatus } from "./registration-status";

export type ClassListLabels = {
	eyebrow?: string;
	title?: string;
	refresh?: string;
	loading?: string;
	empty?: string;
	errors?: {
		membershipRequired?: string;
		membershipStockDepleted?: string;
		capacityFull?: string;
		notRegisterable?: string;
		cancellationClosed?: string;
	};
	result?: Partial<Record<RegistrationStatusValue, string>>;
	classDetail?: ClassDetailLabels;
};

const defaultLabels = {
	eyebrow: "Classes",
	title: "Available classes",
	refresh: "Refresh classes",
	loading: "Loading classes...",
	empty: "No classes are available yet.",
	errors: {
		membershipRequired: "An active membership is required for this class.",
		membershipStockDepleted: "Your membership has no remaining class credits.",
		capacityFull: "This class is full.",
		notRegisterable: "This class is not currently open for registration.",
		cancellationClosed: "Cancellation is closed for this class.",
	},
	result: {
		pending: "Registration submitted for approval.",
		approved: "Registration approved.",
		rejected: "Registration rejected.",
		cancelled: "Registration cancelled.",
	},
} satisfies Omit<Required<ClassListLabels>, "classDetail">;

function registrationMessageKey(errorMessage: string) {
	if (errorMessage.includes("membership_required")) return "membershipRequired";
	if (errorMessage.includes("membership_stock_depleted")) return "membershipStockDepleted";
	if (errorMessage.includes("class_capacity_full")) return "capacityFull";
	if (errorMessage.includes("class_not_registerable")) return "notRegisterable";
	if (errorMessage.includes("registration_cancellation_closed") || errorMessage.includes("Cancellation is closed")) return "cancellationClosed";
	return null;
}

function formatRegistrationResult(response: ClassRegistrationResponse, resultLabels: Partial<Record<RegistrationStatusValue, string>>) {
	return resultLabels[response.status] ?? response.status;
}

export function ClassList({ labels: labelOverrides }: { labels?: ClassListLabels } = {}) {
	const labels = {
		...defaultLabels,
		...labelOverrides,
		errors: { ...defaultLabels.errors, ...labelOverrides?.errors },
		result: { ...defaultLabels.result, ...labelOverrides?.result },
	};
	const { Button } = useClassManagementUi();
	const { client, session, productUser } = useProductContext();
	const [classes, setClasses] = useState<UserClassSummary[]>([]);
	const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [actionPending, setActionPending] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const selectedClass = useMemo(() => classes.find((classItem) => classItem.id === selectedClassId) ?? classes[0] ?? null, [classes, selectedClassId]);
	const isActiveProductUser = productUser?.status === "active";

	const loadClasses = useCallback(async () => {
		setLoading(true);
		setMessage(null);

		const response = await listUserClasses(client, Boolean(session && isActiveProductUser));
		if (response.error) {
			setMessage(response.error.message);
			setClasses([]);
		} else {
			setClasses(response.data.classes);
			setSelectedClassId((current) => (current && response.data.classes.some((classItem) => classItem.id === current) ? current : (response.data.classes[0]?.id ?? null)));
		}

		setLoading(false);
	}, [client, isActiveProductUser, session]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadClasses();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [loadClasses]);

	async function handleRegister(classId: string) {
		setActionPending(true);
		setMessage(null);

		const response = await registerForClass(client, classId);
		if (response.error) {
			const key = registrationMessageKey(response.error.message);
			setMessage(key ? labels.errors[key] : response.error.message);
		} else {
			setMessage(formatRegistrationResult(response.data, labels.result));
			await loadClasses();
			setSelectedClassId(classId);
		}

		setActionPending(false);
	}

	async function handleCancel(registrationId: string) {
		setActionPending(true);
		setMessage(null);

		const response = await cancelClassRegistration(client, registrationId);
		if (response.error) {
			const key = registrationMessageKey(response.error.message);
			setMessage(key ? labels.errors[key] : response.error.message);
		} else {
			setMessage(labels.result.cancelled ?? response.data.status);
			await loadClasses();
		}

		setActionPending(false);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
			<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-display text-xs font-bold uppercase text-accent-foreground">{labels.eyebrow}</p>
						<h3 className="font-display text-xl font-bold uppercase">{labels.title}</h3>
					</div>
					<Button type="button" variant="ghost" size="icon" onClick={() => void loadClasses()} disabled={loading} aria-label={labels.refresh}>
						<RefreshCcw className="size-4" />
					</Button>
				</div>

				{loading ? <p className="mt-4 text-sm text-muted-foreground">{labels.loading}</p> : null}
				{!loading && classes.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{labels.empty}</p> : null}

				<div className="mt-4 grid gap-2">
					{classes.map((classItem) => (
						<button
							type="button"
							key={classItem.id}
							onClick={() => setSelectedClassId(classItem.id)}
							className="rounded-md border border-border bg-background px-3 py-3 text-start transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="font-display text-sm font-bold uppercase">{classItem.name}</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
										<CalendarDays className="size-3.5" />
										{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(classItem.starts_at))}
									</p>
								</div>
								{classItem.user_registration ? (
									<RegistrationStatus status={classItem.user_registration.status} labels={labelOverrides?.classDetail?.registrationStatus} />
								) : null}
							</div>
						</button>
					))}
				</div>
			</div>

			<ClassDetail
				selectedClass={selectedClass}
				actionPending={actionPending}
				message={message}
				onRegister={handleRegister}
				onCancel={handleCancel}
				labels={labelOverrides?.classDetail}
			/>
		</div>
	);
}
