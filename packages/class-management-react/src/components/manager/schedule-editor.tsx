import { CalendarCheck, Eye, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ClassTemplate, type Schedule, type ScheduleGenerationResult, type SchedulePreviewOccurrence } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

type ScheduleForm = {
	id: string | null;
	template_id: string;
	name: string;
	recurrence_type: "one_time" | "weekly";
	weekdays: number[];
	starts_on: string;
	ends_on: string;
	start_time: string;
	duration_minutes: string;
	timezone: string;
};

const emptyForm: ScheduleForm = {
	id: null,
	template_id: "",
	name: "",
	recurrence_type: "weekly",
	weekdays: [0],
	starts_on: new Date().toISOString().slice(0, 10),
	ends_on: "",
	start_time: "19:00",
	duration_minutes: "60",
	timezone: "Asia/Jerusalem",
};

const labels = {
	title: "Schedules",
	refresh: "Refresh",
	template: "Template",
	name: "Name",
	recurrence: "Recurrence",
	startsOn: "Starts on",
	endsOn: "Ends on",
	startTime: "Start time",
	duration: "Duration minutes",
	timezone: "Timezone",
	weekdays: "Weekdays",
	weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	create: "Create",
	update: "Update",
	activate: "Activate",
	preview: "Preview",
	generate: "Generate",
	pause: "Pause",
	archive: "Archive",
	edit: "Edit",
	saveBeforePreview: "Save the schedule before previewing occurrences.",
	generation: (result: ScheduleGenerationResult) => `Created ${result.created_count}, existing ${result.existing_count}, skipped ${result.skipped_count}.`,
	skipped: "skipped",
	archiveChoice: "Archive keeps existing generated classes untouched.",
	saved: "Saved.",
	error: "Unable to complete schedule operation.",
};

export function ScheduleEditor({ templates, onChanged }: { templates: ClassTemplate[]; onChanged: () => void }) {
	const client = useClassManagementClient();
	const { Button, Label } = useClassManagementUi();
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [form, setForm] = useState<ScheduleForm>(emptyForm);
	const [preview, setPreview] = useState<SchedulePreviewOccurrence[]>([]);
	const [generation, setGeneration] = useState<ScheduleGenerationResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const loadSchedules = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ schedules: Schedule[] }>(client, "schedules", { action: "list" });
			setSchedules(data.schedules);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadSchedules(), 0);
		return () => window.clearTimeout(timer);
	}, [loadSchedules]);

	function editSchedule(schedule: Schedule) {
		setForm({
			id: schedule.id,
			template_id: schedule.template_id,
			name: schedule.name,
			recurrence_type: schedule.recurrence_type,
			weekdays: schedule.weekdays,
			starts_on: schedule.starts_on,
			ends_on: schedule.ends_on ?? "",
			start_time: schedule.start_time.slice(0, 5),
			duration_minutes: String(schedule.duration_minutes),
			timezone: schedule.timezone,
		});
	}

	function requestBody(status?: string) {
		return {
			action: form.id ? "update" : "create",
			schedule_id: form.id ?? undefined,
			template_id: form.template_id,
			name: form.name,
			status,
			recurrence_type: form.recurrence_type,
			weekdays: form.recurrence_type === "weekly" ? form.weekdays : [],
			starts_on: form.starts_on,
			ends_on: form.recurrence_type === "weekly" && form.ends_on ? form.ends_on : null,
			start_time: form.start_time,
			duration_minutes: Number(form.duration_minutes),
			timezone: form.timezone,
		};
	}

	async function saveSchedule(status = "draft") {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ schedule: Schedule; generation: ScheduleGenerationResult | null }>(client, "schedules", requestBody(status));
			setGeneration(data.generation);
			setForm(emptyForm);
			await loadSchedules();
			onChanged();
			setMessage(labels.saved);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function previewSchedule() {
		if (!form.id) {
			setMessage(labels.saveBeforePreview);
			return;
		}
		const through = form.ends_on || addDays(form.starts_on, 56);
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ occurrences: SchedulePreviewOccurrence[] }>(client, "schedules", { action: "preview", schedule_id: form.id, from: form.starts_on, through });
			setPreview(data.occurrences);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function changeStatus(schedule: Schedule, action: "pause" | "archive") {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "schedules", { action, schedule_id: schedule.id });
			await loadSchedules();
			onChanged();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function generate(scheduleId?: string) {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<ScheduleGenerationResult>(client, "schedule-generate", { schedule_id: scheduleId ?? null });
			setGeneration(data);
			onChanged();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center justify-between gap-3">
				<h3 className="font-display text-lg font-bold uppercase">{labels.title}</h3>
				<Button type="button" variant="outline" size="sm" onClick={loadSchedules} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 md:grid-cols-3">
				<SelectField label={labels.template} value={form.template_id} values={templates.filter((template) => template.status === "active").map((template) => [template.id, template.name])} onChange={(value) => setForm({ ...form, template_id: value })} />
				<TextField label={labels.name} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
				<SelectField label={labels.recurrence} value={form.recurrence_type} values={[["weekly", "weekly"], ["one_time", "one_time"]]} onChange={(value) => setForm({ ...form, recurrence_type: value as "one_time" | "weekly", weekdays: value === "one_time" ? [] : form.weekdays })} />
				<TextField label={labels.startsOn} type="date" value={form.starts_on} onChange={(value) => setForm({ ...form, starts_on: value })} />
				<TextField label={labels.endsOn} type="date" value={form.ends_on} onChange={(value) => setForm({ ...form, ends_on: value })} disabled={form.recurrence_type === "one_time"} />
				<TextField label={labels.startTime} type="time" value={form.start_time} onChange={(value) => setForm({ ...form, start_time: value })} />
				<TextField label={labels.duration} type="number" value={form.duration_minutes} onChange={(value) => setForm({ ...form, duration_minutes: value })} />
				<TextField label={labels.timezone} value={form.timezone} onChange={(value) => setForm({ ...form, timezone: value })} />
				<div className="grid gap-2">
					<Label>{labels.weekdays}</Label>
					<div className="flex flex-wrap gap-2">
						{[0, 1, 2, 3, 4, 5, 6].map((day) => (
							<label key={day} className="flex items-center gap-1 text-sm">
								<input type="checkbox" disabled={form.recurrence_type === "one_time"} checked={form.weekdays.includes(day)} onChange={(event) => setForm({ ...form, weekdays: event.target.checked ? [...form.weekdays, day].sort() : form.weekdays.filter((item) => item !== day) })} />
								{labels.weekdaysShort[day]}
							</label>
						))}
					</div>
				</div>
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button type="button" onClick={() => saveSchedule("draft")} disabled={loading || !form.template_id || !form.name}>
					<CalendarCheck className="size-4" />
					{form.id ? labels.update : labels.create}
				</Button>
				<Button type="button" variant="outline" onClick={() => saveSchedule("active")} disabled={loading || !form.template_id || !form.name}>
					<Play className="size-4" />
					{labels.activate}
				</Button>
				<Button type="button" variant="outline" onClick={previewSchedule} disabled={loading || !form.id}>
					<Eye className="size-4" />
					{labels.preview}
				</Button>
				<Button type="button" variant="outline" onClick={() => generate(form.id ?? undefined)} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.generate}
				</Button>
			</div>
			{generation ? <p className="mt-3 text-sm text-muted-foreground">{labels.generation(generation)}</p> : null}
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			{preview.length > 0 ? (
				<div className="mt-4 grid gap-2">
					{preview.slice(0, 12).map((occurrence) => (
						<div key={`${occurrence.date}-${occurrence.starts_at}`} className="rounded-md border border-border px-3 py-2 text-sm">
							{occurrence.date} · {occurrence.local_start} · {occurrence.timezone} {occurrence.skipped ? `· ${labels.skipped}` : ""}
						</div>
					))}
				</div>
			) : null}
			<div className="mt-4 grid gap-2">
				{schedules.map((schedule) => (
					<div key={schedule.id} className="rounded-md border border-border px-3 py-2 text-sm">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span>
								{schedule.name} · {schedule.status} · {schedule.recurrence_type}
							</span>
							<div className="flex flex-wrap gap-2">
								<Button type="button" variant="outline" size="sm" onClick={() => editSchedule(schedule)}>
									{labels.edit}
								</Button>
								<Button type="button" variant="outline" size="sm" onClick={() => generate(schedule.id)}>
									{labels.generate}
								</Button>
								<Button type="button" variant="ghost" size="sm" onClick={() => changeStatus(schedule, "pause")} disabled={schedule.status === "paused"}>
									{labels.pause}
								</Button>
								<Button type="button" variant="ghost" size="sm" onClick={() => changeStatus(schedule, "archive")} disabled={schedule.status === "archived"}>
									{labels.archive}
								</Button>
							</div>
						</div>
						{schedule.status !== "archived" ? <p className="mt-2 text-xs text-muted-foreground">{labels.archiveChoice}</p> : null}
					</div>
				))}
			</div>
		</div>
	);
}

function addDays(date: string, days: number) {
	const next = new Date(`${date}T00:00:00Z`);
	next.setUTCDate(next.getUTCDate() + days);
	return next.toISOString().slice(0, 10);
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
	const { Input, Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
		</div>
	);
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: [string, string][]; onChange: (value: string) => void }) {
	const { Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
				<option value="">{label}</option>
				{values.map(([itemValue, itemLabel]) => (
					<option key={itemValue} value={itemValue}>
						{itemLabel}
					</option>
				))}
			</select>
		</div>
	);
}
