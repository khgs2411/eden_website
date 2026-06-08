import { Check, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ManagedClass, type Registration } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

const labels = {
	title: "Pending registrations",
	refresh: "Refresh",
	empty: "No pending registrations.",
	approve: "Approve",
	reject: "Reject",
	capacityError: "Unable to update registration. Check capacity and membership rules.",
	error: "Unable to load pending registrations.",
};

export function PendingRegistrations({ refreshKey }: { refreshKey: number }) {
	const client = useClassManagementClient();
	const { Button } = useClassManagementUi();
	const [registrations, setRegistrations] = useState<Registration[]>([]);
	const [classes, setClasses] = useState<ManagedClass[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const classesById = useMemo(() => new Map(classes.map((classRow) => [classRow.id, classRow])), [classes]);

	const loadQueue = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const [registrationData, classData] = await Promise.all([
				callManagerApi<{ registrations: Registration[] }>(client, "manage-registrations", { action: "list_pending" }),
				callManagerApi<{ classes: ManagedClass[] }>(client, "classes", { action: "list_manager" }),
			]);
			setRegistrations(registrationData.registrations);
			setClasses(classData.classes);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadQueue(), 0);
		return () => window.clearTimeout(timer);
	}, [loadQueue, refreshKey]);

	async function decide(registrationId: string, action: "approve" | "reject") {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "manage-registrations", { action, registration_id: registrationId });
			await loadQueue();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.capacityError);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center justify-between gap-3">
				<h3 className="font-display text-lg font-bold uppercase">{labels.title}</h3>
				<Button type="button" variant="outline" size="sm" onClick={loadQueue} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{registrations.length === 0 ? <p className="text-sm text-muted-foreground">{labels.empty}</p> : null}
				{registrations.map((registration) => {
					const classRow = classesById.get(registration.class_id);
					return (
						<div key={registration.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
							<div>
								<p>{classRow?.name ?? registration.class_id}</p>
								<p className="text-xs text-muted-foreground">
									{registration.user_id} · {formatDate(registration.created_at)}
								</p>
							</div>
							<div className="flex gap-2">
								<Button type="button" size="sm" onClick={() => decide(registration.id, "approve")} disabled={loading}>
									<Check className="size-4" />
									{labels.approve}
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={() => decide(registration.id, "reject")} disabled={loading}>
									<X className="size-4" />
									{labels.reject}
								</Button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
