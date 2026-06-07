import { CalendarDays, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { AuthPanel } from "@/components/product/auth-panel";
import { GeneratedClassList } from "@/components/product/manager/generated-class-list";
import { callManagerApi, type ClassTemplate, type Schedule } from "@/components/product/manager/manager-api";
import { PendingRegistrations } from "@/components/product/manager/pending-registrations";
import { ScheduleEditor } from "@/components/product/manager/schedule-editor";
import { TemplateEditor } from "@/components/product/manager/template-editor";
import { ClassList } from "@/components/product/user/class-list";
import { Button } from "@/components/ui/button";
import { useProductContext } from "@/lib/product-context-state";

export function ProductShell() {
	const { t } = useTranslation();
	const { productKey, product, productUser, loading, error } = useProductContext();
	const hasActiveProductUser = productUser?.status === "active";
	const isManager = productUser?.role === "manager" && hasActiveProductUser;

	return (
		<section id="product" className="bg-background px-6 py-10 lg:px-10">
			<div className="border-t border-border pt-8">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="font-display text-xs font-bold uppercase text-accent-foreground">{t("productShell.eyebrow")}</p>
						<h2 className="mt-1 font-display text-3xl font-bold uppercase">{t("productShell.title")}</h2>
					</div>
					<div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
						{t("productShell.productKey", { productKey })}
					</div>
				</div>

				<div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
					<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
						{loading ? <p className="text-sm text-muted-foreground">{t("productShell.loading")}</p> : null}
						{error ? <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">{error}</p> : null}
						{product ? (
							<div className="grid gap-1">
								<p className="font-display text-xl font-bold uppercase">{product.name}</p>
								<p className="text-sm text-muted-foreground">
									{productUser ? t(`productShell.roles.${productUser.role}`) : t("productShell.roles.anonymous")}
								</p>
							</div>
						) : null}

						<div className="mt-5 grid gap-2">
							<Button type="button" variant="outline" className="h-auto justify-start px-3 py-3" disabled={!hasActiveProductUser}>
								<UserRound className="size-4" />
								{t("productShell.nav.user")}
							</Button>
							<Button type="button" variant="outline" className="h-auto justify-start px-3 py-3" disabled={!isManager}>
								<ShieldCheck className="size-4" />
								{t("productShell.nav.manager")}
							</Button>
						</div>
					</div>

					<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
						<div className="grid gap-3">
							{hasActiveProductUser ? (
								<ClassList />
							) : null}
							{isManager ? (
								<div className="flex items-center gap-2">
									<CalendarDays className="size-4 text-accent-foreground" />
									<p className="font-display text-sm font-bold uppercase">{t("productShell.placeholders.manager")}</p>
								</div>
							) : null}
						</div>
						<AuthPanel />
					</div>
				</div>
				{isManager ? <ManagerClassOperations /> : null}
			</div>
		</section>
	);
}

function ManagerClassOperations() {
	const { t } = useTranslation();
	const [templates, setTemplates] = useState<ClassTemplate[]>([]);
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [refreshKey, setRefreshKey] = useState(0);
	const [message, setMessage] = useState<string | null>(null);

	const refreshSharedData = useCallback(async () => {
		try {
			const [templateData, scheduleData] = await Promise.all([
				callManagerApi<{ templates: ClassTemplate[] }>("templates", { action: "list" }),
				callManagerApi<{ schedules: Schedule[] }>("schedules", { action: "list" }),
			]);
			setTemplates(templateData.templates);
			setSchedules(scheduleData.schedules);
			setRefreshKey((value) => value + 1);
			setMessage(null);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		}
	}, [t]);

	useEffect(() => {
		const timer = window.setTimeout(() => void refreshSharedData(), 0);
		return () => window.clearTimeout(timer);
	}, [refreshSharedData]);

	return (
		<div className="mt-6 grid gap-5">
			{message ? <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
			<TemplateEditor onChanged={refreshSharedData} />
			<ScheduleEditor templates={templates} onChanged={refreshSharedData} />
			<GeneratedClassList templates={templates} schedules={schedules} refreshKey={refreshKey} />
			<PendingRegistrations refreshKey={refreshKey} />
		</div>
	);
}
