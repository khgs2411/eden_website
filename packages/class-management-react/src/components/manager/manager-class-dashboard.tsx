import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ClassTemplate, type Schedule } from "../../manager/manager-api";
import { GeneratedClassList } from "./generated-class-list";
import { PendingRegistrations } from "./pending-registrations";
import { ScheduleEditor } from "./schedule-editor";
import { TemplateEditor } from "./template-editor";

export function ManagerClassDashboard() {
	const client = useClassManagementClient();
	const [templates, setTemplates] = useState<ClassTemplate[]>([]);
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [refreshKey, setRefreshKey] = useState(0);
	const [message, setMessage] = useState<string | null>(null);

	const refreshSharedData = useCallback(async () => {
		try {
			const [templateData, scheduleData] = await Promise.all([
				callManagerApi<{ templates: ClassTemplate[] }>(client, "templates", { action: "list" }),
				callManagerApi<{ schedules: Schedule[] }>(client, "schedules", { action: "list" }),
			]);
			setTemplates(templateData.templates);
			setSchedules(scheduleData.schedules);
			setRefreshKey((value) => value + 1);
			setMessage(null);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Unable to load manager data.");
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void refreshSharedData(), 0);
		return () => window.clearTimeout(timer);
	}, [refreshSharedData]);

	return (
		<section className="mt-6 grid gap-5">
			{message ? <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">{message}</p> : null}
			<TemplateEditor onChanged={refreshSharedData} />
			<ScheduleEditor templates={templates} onChanged={refreshSharedData} />
			<GeneratedClassList templates={templates} schedules={schedules} refreshKey={refreshKey} />
			<PendingRegistrations refreshKey={refreshKey} />
		</section>
	);
}
