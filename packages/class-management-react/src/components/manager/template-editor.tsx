import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ClassTemplate, type CustomField, type CustomFieldType } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

const fieldTypes: CustomFieldType[] = ["text", "long text", "number", "boolean", "select", "multi-select", "date", "URL"];

type TemplateForm = {
	id: string | null;
	name: string;
	description: string;
	category: string;
	default_capacity: string;
	default_location: string;
	default_visibility: string;
	default_registration_policy: string;
	default_membership_requirement: string;
	default_notes: string;
	custom_fields: CustomField[];
};

const emptyForm: TemplateForm = {
	id: null,
	name: "",
	description: "",
	category: "",
	default_capacity: "20",
	default_location: "",
	default_visibility: "public",
	default_registration_policy: "member_auto_approve",
	default_membership_requirement: "none",
	default_notes: "",
	custom_fields: [],
};

const labels = {
	title: "Class templates",
	defaultsNote: "Template defaults are copied into generated classes.",
	refresh: "Refresh",
	name: "Name",
	capacity: "Capacity",
	category: "Category",
	location: "Location",
	visibility: "Visibility",
	registrationPolicy: "Registration policy",
	membershipRequirement: "Membership requirement",
	description: "Description",
	customFields: "Custom fields",
	add: "Add",
	key: "Key",
	label: "Label",
	required: "Required",
	update: "Update",
	create: "Create",
	reset: "Reset",
	edit: "Edit",
	deactivate: "Deactivate",
	saved: "Saved.",
	error: "Unable to complete manager operation.",
};

export function TemplateEditor({ onChanged }: { onChanged: () => void }) {
	const client = useClassManagementClient();
	const { Button, Input, Label, Textarea } = useClassManagementUi();
	const [templates, setTemplates] = useState<ClassTemplate[]>([]);
	const [form, setForm] = useState<TemplateForm>(emptyForm);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const loadTemplates = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ templates: ClassTemplate[] }>(client, "templates", { action: "list" });
			setTemplates(data.templates);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadTemplates(), 0);
		return () => window.clearTimeout(timer);
	}, [loadTemplates]);

	function editTemplate(template: ClassTemplate) {
		setForm({
			id: template.id,
			name: template.name,
			description: template.description ?? "",
			category: template.category ?? "",
			default_capacity: String(template.default_capacity),
			default_location: template.default_location ?? "",
			default_visibility: template.default_visibility,
			default_registration_policy: template.default_registration_policy,
			default_membership_requirement: template.default_membership_requirement,
			default_notes: template.default_notes ?? "",
			custom_fields: template.custom_fields ?? [],
		});
	}

	function updateField(index: number, patch: Partial<CustomField>) {
		setForm((current) => ({
			...current,
			custom_fields: current.custom_fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field)),
		}));
	}

	async function saveTemplate() {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "templates", {
				action: form.id ? "update" : "create",
				template_id: form.id ?? undefined,
				name: form.name,
				description: form.description || null,
				category: form.category || null,
				default_capacity: Number(form.default_capacity),
				default_location: form.default_location || null,
				default_visibility: form.default_visibility,
				default_registration_policy: form.default_registration_policy,
				default_membership_requirement: form.default_membership_requirement,
				default_notes: form.default_notes || null,
				custom_fields: form.custom_fields,
				custom_defaults: {},
			});
			setForm(emptyForm);
			await loadTemplates();
			onChanged();
			setMessage(labels.saved);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function deactivateTemplate(templateId: string) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "templates", { action: "deactivate", template_id: templateId });
			await loadTemplates();
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
				<div>
					<h3 className="font-display text-lg font-bold uppercase">{labels.title}</h3>
					<p className="text-sm text-muted-foreground">{labels.defaultsNote}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadTemplates} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 md:grid-cols-2">
				<TextField label={labels.name} value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
				<TextField label={labels.capacity} type="number" value={form.default_capacity} onChange={(value) => setForm({ ...form, default_capacity: value })} />
				<TextField label={labels.category} value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
				<TextField label={labels.location} value={form.default_location} onChange={(value) => setForm({ ...form, default_location: value })} />
				<SelectField label={labels.visibility} value={form.default_visibility} values={["public", "hidden", "members_only"]} onChange={(value) => setForm({ ...form, default_visibility: value })} />
				<SelectField label={labels.registrationPolicy} value={form.default_registration_policy} values={["auto_approve", "member_auto_approve", "approval_required"]} onChange={(value) => setForm({ ...form, default_registration_policy: value })} />
				<SelectField label={labels.membershipRequirement} value={form.default_membership_requirement} values={["none", "required"]} onChange={(value) => setForm({ ...form, default_membership_requirement: value })} />
				<div className="grid gap-2 md:col-span-2">
					<Label>{labels.description}</Label>
					<Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
				</div>
			</div>
			<div className="mt-4 grid gap-2">
				<div className="flex items-center justify-between">
					<Label>{labels.customFields}</Label>
					<Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, custom_fields: [...form.custom_fields, { key: "", label: "", type: "text", required: false }] })}>
						<Plus className="size-4" />
						{labels.add}
					</Button>
				</div>
				{form.custom_fields.map((field, index) => (
					<div key={index} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto_auto]">
						<Input placeholder={labels.key} value={field.key} onChange={(event) => updateField(index, { key: event.target.value })} />
						<Input placeholder={labels.label} value={field.label} onChange={(event) => updateField(index, { label: event.target.value })} />
						<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={field.type} onChange={(event) => updateField(index, { type: event.target.value as CustomFieldType })}>
							{fieldTypes.map((type) => (
								<option key={type} value={type}>
									{type}
								</option>
							))}
						</select>
						<label className="flex items-center gap-2 text-sm">
							<input type="checkbox" checked={field.required} onChange={(event) => updateField(index, { required: event.target.checked })} />
							{labels.required}
						</label>
						<Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, custom_fields: form.custom_fields.filter((_, fieldIndex) => fieldIndex !== index) })}>
							<Trash2 className="size-4" />
						</Button>
					</div>
				))}
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button type="button" onClick={saveTemplate} disabled={loading || !form.name}>
					<Save className="size-4" />
					{form.id ? labels.update : labels.create}
				</Button>
				<Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>
					{labels.reset}
				</Button>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{templates.map((template) => (
					<div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
						<span>
							{template.name} · {template.status}
						</span>
						<div className="flex gap-2">
							<Button type="button" variant="outline" size="sm" onClick={() => editTemplate(template)}>
								{labels.edit}
							</Button>
							<Button type="button" variant="ghost" size="sm" onClick={() => deactivateTemplate(template.id)} disabled={template.status === "inactive"}>
								{labels.deactivate}
							</Button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
	const { Input, Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} min={type === "number" ? 1 : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
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
