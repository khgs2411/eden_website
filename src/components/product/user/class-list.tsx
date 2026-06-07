import { CalendarDays, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { ClassDetail } from "@/components/product/user/class-detail";
import { RegistrationStatus } from "@/components/product/user/registration-status";
import { Button } from "@/components/ui/button";
import { cancelClassRegistration, listUserClasses, registerForClass, type UserClassSummary } from "@/lib/product-api";
import { useProductContext } from "@/lib/product-context-state";

function registrationMessageKey(errorMessage: string) {
	if (errorMessage.includes("membership_required")) return "membershipRequired";
	if (errorMessage.includes("membership_stock_depleted")) return "membershipStockDepleted";
	if (errorMessage.includes("class_capacity_full")) return "capacityFull";
	if (errorMessage.includes("class_not_registerable")) return "notRegisterable";
	return null;
}

export function ClassList() {
	const { t } = useTranslation();
	const { session, productUser } = useProductContext();
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

		const response = await listUserClasses(Boolean(session && isActiveProductUser));
		if (response.error) {
			setMessage(response.error.message);
			setClasses([]);
		} else {
			setClasses(response.data.classes);
			setSelectedClassId((current) => (current && response.data.classes.some((classItem) => classItem.id === current) ? current : (response.data.classes[0]?.id ?? null)));
		}

		setLoading(false);
	}, [isActiveProductUser, session]);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void loadClasses();
		}, 0);

		return () => window.clearTimeout(timeoutId);
	}, [loadClasses]);

	async function handleRegister(classId: string) {
		setActionPending(true);
		setMessage(null);

		const response = await registerForClass(classId);
		if (response.error) {
			const key = registrationMessageKey(response.error.message);
			setMessage(key ? t(`productShell.classes.errors.${key}`) : response.error.message);
		} else {
			setMessage(t(`productShell.classes.result.${response.data.status}`));
			await loadClasses();
			setSelectedClassId(classId);
		}

		setActionPending(false);
	}

	async function handleCancel(registrationId: string) {
		setActionPending(true);
		setMessage(null);

		const response = await cancelClassRegistration(registrationId);
		if (response.error) {
			const key = registrationMessageKey(response.error.message);
			setMessage(key ? t(`productShell.classes.errors.${key}`) : response.error.message);
		} else {
			setMessage(t("productShell.classes.result.cancelled"));
			await loadClasses();
		}

		setActionPending(false);
	}

	return (
		<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
			<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="font-display text-xs font-bold uppercase text-accent-foreground">{t("productShell.classes.eyebrow")}</p>
						<h3 className="font-display text-xl font-bold uppercase">{t("productShell.classes.title")}</h3>
					</div>
					<Button type="button" variant="ghost" size="icon" onClick={() => void loadClasses()} disabled={loading} aria-label={t("productShell.classes.refresh")}>
						<RefreshCcw className="size-4" />
					</Button>
				</div>

				{loading ? <p className="mt-4 text-sm text-muted-foreground">{t("productShell.classes.loading")}</p> : null}
				{!loading && classes.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{t("productShell.classes.empty")}</p> : null}

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
								{classItem.user_registration ? <RegistrationStatus status={classItem.user_registration.status} /> : null}
							</div>
						</button>
					))}
				</div>
			</div>

			<ClassDetail selectedClass={selectedClass} actionPending={actionPending} message={message} onRegister={handleRegister} onCancel={handleCancel} />
		</div>
	);
}
