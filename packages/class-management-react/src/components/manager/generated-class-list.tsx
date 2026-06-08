import { Ban, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ClassTemplate, type ManagedClass, type Schedule } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

type ClassForm = {
	id: string;
	name: string;
	starts_at: string;
	ends_at: string;
	capacity: string;
	location: string;
	status: string;
	visibility: string;
	registration_policy: string;
	membership_requirement: string;
	notes: string;
};

const labels = {
	title: "Generated classes",
	overrideNote: "Edit generated class snapshots or cancel future occurrences.",
	refresh: "Refresh",
	name: "Name",
	startsAt: "Starts at",
	endsAt: "Ends at",
	capacity: "Capacity",
	location: "Location",
	status: "Status",
	visibility: "Visibility",
	registrationPolicy: "Registration policy",
	membershipRequirement: "Membership requirement",
	notes: "Notes",
	update: "Update",
	cancel: "Cancel",
	edit: "Edit",
	cancelClass: "Cancel class",
	overrideSaved: "Class override saved.",
	scheduleCancellationTitle: "Bulk cancel generated classes",
	scheduleCancellationBody: "Select future generated classes to cancel them without changing the schedule.",
	cancelSelected: (count: number) => `Cancel selected (${count})`,
	source: (template: string, schedule: string) => `Template: ${template} · Schedule: ${schedule}`,
	none: "None",
	error: "Unable to complete class operation.",
};

export function GeneratedClassList({ templates, schedules, refreshKey }: { templates: ClassTemplate[]; schedules: Schedule[]; refreshKey: number }) {
	const client = useClassManagementClient();
	const { Button, Label, Textarea } = useClassManagementUi();
	const [classes, setClasses] = useState<ManagedClass[]>([]);
	const [editing, setEditing] = useState<ClassForm | null>(null);
	const [selected, setSelected] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [now, setNow] = useState(() => Date.now());

	const templateNames = useMemo(() => new Map(templates.map((template) => [template.id, template.name])), [templates]);
	const scheduleNames = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule.name])), [schedules]);

	const loadClasses = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ classes: ManagedClass[] }>(client, "classes", { action: "list_manager" });
			setClasses(data.classes);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setNow(Date.now());
			void loadClasses();
		}, 0);
		return () => window.clearTimeout(timer);
	}, [loadClasses, refreshKey]);

	function editClass(classRow: ManagedClass) {
		setEditing({
			id: classRow.id,
			name: classRow.name,
			starts_at: toLocalInput(classRow.starts_at),
			ends_at: toLocalInput(classRow.ends_at),
			capacity: String(classRow.capacity),
			location: classRow.location ?? "",
			status: classRow.status,
			visibility: classRow.visibility,
			registration_policy: classRow.registration_policy,
			membership_requirement: classRow.membership_requirement,
			notes: classRow.notes ?? "",
		});
	}

	async function saveClass() {
		if (!editing) return;
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "classes", {
				action: "update",
				class_id: editing.id,
				name: editing.name,
				starts_at: new Date(editing.starts_at).toISOString(),
				ends_at: new Date(editing.ends_at).toISOString(),
				capacity: Number(editing.capacity),
				location: editing.location || null,
				status: editing.status,
				visibility: editing.visibility,
				registration_policy: editing.registration_policy,
				membership_requirement: editing.membership_requirement,
				notes: editing.notes || null,
			});
			setEditing(null);
			await loadClasses();
			setMessage(labels.overrideSaved);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function cancelClass(classId: string) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "classes", { action: "cancel", class_id: classId });
			await loadClasses();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function cancelSelected() {
		for (const classId of selected) {
			await cancelClass(classId);
		}
		setSelected([]);
	}

	const futureGeneratedClasses = classes.filter((classRow) => classRow.schedule_id && classRow.lifecycle_status === "created" && Date.parse(classRow.starts_at) > now);

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="font-display text-lg font-bold uppercase">{labels.title}</h3>
					<p className="text-sm text-muted-foreground">{labels.overrideNote}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadClasses} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>
			{editing ? (
				<div className="mt-4 grid gap-3 rounded-md border border-border p-3 md:grid-cols-3">
					<TextField label={labels.name} value={editing.name} onChange={(value) => setEditing({ ...editing, name: value })} />
					<TextField label={labels.startsAt} type="datetime-local" value={editing.starts_at} onChange={(value) => setEditing({ ...editing, starts_at: value })} />
					<TextField label={labels.endsAt} type="datetime-local" value={editing.ends_at} onChange={(value) => setEditing({ ...editing, ends_at: value })} />
					<TextField label={labels.capacity} type="number" value={editing.capacity} onChange={(value) => setEditing({ ...editing, capacity: value })} />
					<TextField label={labels.location} value={editing.location} onChange={(value) => setEditing({ ...editing, location: value })} />
					<SelectField label={labels.status} value={editing.status} values={["draft", "published"]} onChange={(value) => setEditing({ ...editing, status: value })} />
					<SelectField label={labels.visibility} value={editing.visibility} values={["public", "hidden", "members_only"]} onChange={(value) => setEditing({ ...editing, visibility: value })} />
					<SelectField label={labels.registrationPolicy} value={editing.registration_policy} values={["auto_approve", "member_auto_approve", "approval_required"]} onChange={(value) => setEditing({ ...editing, registration_policy: value })} />
					<SelectField label={labels.membershipRequirement} value={editing.membership_requirement} values={["none", "required"]} onChange={(value) => setEditing({ ...editing, membership_requirement: value })} />
					<div className="grid gap-2 md:col-span-3">
						<Label>{labels.notes}</Label>
						<Textarea value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} />
					</div>
					<div className="flex gap-2 md:col-span-3">
						<Button type="button" onClick={saveClass} disabled={loading}>
							<Save className="size-4" />
							{labels.update}
						</Button>
						<Button type="button" variant="outline" onClick={() => setEditing(null)}>
							{labels.cancel}
						</Button>
					</div>
				</div>
			) : null}
			<div className="mt-4 rounded-md border border-border p-3">
				<p className="text-sm font-medium">{labels.scheduleCancellationTitle}</p>
				<p className="mt-1 text-xs text-muted-foreground">{labels.scheduleCancellationBody}</p>
				<Button type="button" className="mt-3" variant="outline" size="sm" onClick={cancelSelected} disabled={selected.length === 0 || loading}>
					<Ban className="size-4" />
					{labels.cancelSelected(selected.length)}
				</Button>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{classes.map((classRow) => (
					<div key={classRow.id} className="rounded-md border border-border px-3 py-2 text-sm">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div className="flex items-center gap-2">
								{futureGeneratedClasses.some((item) => item.id === classRow.id) ? <input type="checkbox" checked={selected.includes(classRow.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, classRow.id] : selected.filter((id) => id !== classRow.id))} /> : null}
								<span>
									{classRow.name} · {formatDate(classRow.starts_at)} · {classRow.lifecycle_status}
								</span>
							</div>
							<div className="flex flex-wrap gap-2">
								<Button type="button" variant="outline" size="sm" onClick={() => editClass(classRow)}>
									{labels.edit}
								</Button>
								<Button type="button" variant="ghost" size="sm" onClick={() => cancelClass(classRow.id)} disabled={classRow.lifecycle_status === "cancelled"}>
									{labels.cancelClass}
								</Button>
							</div>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{labels.source(classRow.template_id ? templateNames.get(classRow.template_id) ?? classRow.template_id : labels.none, classRow.schedule_id ? scheduleNames.get(classRow.schedule_id) ?? classRow.schedule_id : labels.none)}
						</p>
						{classRow.generated_for_date || classRow.source_timezone ? <p className="mt-1 text-xs text-muted-foreground">{[classRow.generated_for_date, classRow.source_timezone].filter(Boolean).join(" · ")}</p> : null}
					</div>
				))}
			</div>
		</div>
	);
}

function toLocalInput(value: string) {
	const date = new Date(value);
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
	const { Input, Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
		</div>
	);
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
	const { Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
				{values.map((item) => (
					<option key={item} value={item}>
						{item}
					</option>
				))}
			</select>
		</div>
	);
}
