import { Pencil, RefreshCw, ShieldMinus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type MembershipMode, type MembershipType } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

const modes: MembershipMode[] = ["stock", "limited_stock", "limited", "infinite"];

const labels = {
	title: "Membership types",
	modesNote: "Membership mode controls stock and expiration defaults.",
	refresh: "Refresh",
	name: "Name",
	mode: "Mode",
	defaultStock: "Default stock",
	defaultDuration: "Default duration days",
	create: "Create",
	edit: "Edit",
	cancel: "Cancel",
	save: "Save",
	deactivate: "Deactivate",
	saved: "Saved.",
	error: "Unable to complete manager operation.",
	futureOnly: "Edits apply to future grants only. Existing grants keep their issued stock and validity.",
	modes: {
		stock: "Stock",
		limited_stock: "Limited stock",
		limited: "Limited",
		infinite: "Infinite",
	},
};

export function MembershipTypes({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
	const client = useClassManagementClient();
	const { Button, Label } = useClassManagementUi();
	const [types, setTypes] = useState<MembershipType[]>([]);
	const [name, setName] = useState("");
	const [mode, setMode] = useState<MembershipMode>("stock");
	const [defaultStock, setDefaultStock] = useState("");
	const [defaultDurationDays, setDefaultDurationDays] = useState("");
	const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editDefaultStock, setEditDefaultStock] = useState("");
	const [editDefaultDurationDays, setEditDefaultDurationDays] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const loadTypes = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ membership_types: MembershipType[] }>(client, "memberships", { action: "list_types" });
			setTypes(data.membership_types);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadTypes(), 0);
		return () => window.clearTimeout(timer);
	}, [loadTypes, refreshKey]);

	async function createType() {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "memberships", {
				action: "create_type",
				name: name.trim(),
				mode,
				default_stock: usesStock(mode) && defaultStock ? Number(defaultStock) : null,
				default_duration_days: usesDuration(mode) && defaultDurationDays ? Number(defaultDurationDays) : null,
			});
			setName("");
			setDefaultStock("");
			setDefaultDurationDays("");
			await loadTypes();
			onChanged();
			setMessage(labels.saved);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	function startEdit(type: MembershipType) {
		setEditingTypeId(type.id);
		setEditName(type.name);
		setEditDefaultStock(type.default_stock?.toString() ?? "");
		setEditDefaultDurationDays(type.default_duration_days?.toString() ?? "");
		setMessage(null);
	}

	function cancelEdit() {
		setEditingTypeId(null);
		setEditName("");
		setEditDefaultStock("");
		setEditDefaultDurationDays("");
	}

	async function updateType(type: MembershipType) {
		setLoading(true);
		setMessage(null);
		try {
			const payload: {
				action: "update_type";
				membership_type_id: string;
				name: string;
				default_stock?: number | null;
				default_duration_days?: number | null;
			} = {
				action: "update_type",
				membership_type_id: type.id,
				name: editName.trim(),
			};

			if (usesStock(type.mode)) {
				payload.default_stock = editDefaultStock ? Number(editDefaultStock) : null;
			}

			if (usesDuration(type.mode)) {
				payload.default_duration_days = editDefaultDurationDays ? Number(editDefaultDurationDays) : null;
			}

			await callManagerApi(client, "memberships", payload);
			cancelEdit();
			await loadTypes();
			onChanged();
			setMessage(labels.saved);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}

	async function deactivateType(id: string) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi(client, "memberships", { action: "deactivate_type", membership_type_id: id });
			await loadTypes();
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
					<p className="text-sm text-muted-foreground">{labels.modesNote}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadTypes} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 rounded-md border border-border p-3 md:grid-cols-4">
				<TextField label={labels.name} value={name} onChange={setName} />
				<div className="grid gap-2">
					<Label>{labels.mode}</Label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as MembershipMode)}>
						{modes.map((item) => <option key={item} value={item}>{labels.modes[item]}</option>)}
					</select>
				</div>
				<TextField label={labels.defaultStock} type="number" value={defaultStock} onChange={setDefaultStock} disabled={!usesStock(mode)} />
				<TextField label={labels.defaultDuration} type="number" value={defaultDurationDays} onChange={setDefaultDurationDays} disabled={!usesDuration(mode)} />
				<div className="md:col-span-4">
					<Button type="button" onClick={createType} disabled={loading || name.trim().length === 0}>{labels.create}</Button>
				</div>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{types.map((type) => {
					const isEditing = editingTypeId === type.id;

					return (
						<div key={type.id} className="grid gap-3 rounded-md border border-border px-3 py-2 text-sm md:grid-cols-[1fr_auto]">
							{isEditing ? (
								<div className="grid gap-3 md:grid-cols-3">
									<TextField label={labels.name} value={editName} onChange={setEditName} />
									<TextField label={labels.defaultStock} type="number" value={editDefaultStock} onChange={setEditDefaultStock} disabled={!usesStock(type.mode)} />
									<TextField label={labels.defaultDuration} type="number" value={editDefaultDurationDays} onChange={setEditDefaultDurationDays} disabled={!usesDuration(type.mode)} />
									<p className="text-xs text-muted-foreground md:col-span-3">{labels.futureOnly}</p>
								</div>
							) : (
								<div>
									<p>{type.name} · {labels.modes[type.mode]} · {type.status}</p>
									<p className="text-xs text-muted-foreground">{formatTypeLimits(type)}</p>
								</div>
							)}
							<div className="flex flex-wrap items-center gap-2 md:justify-end">
								{isEditing ? (
									<>
										<Button type="button" size="sm" onClick={() => updateType(type)} disabled={loading || editName.trim().length === 0}>{labels.save}</Button>
										<Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={loading}>
											<X className="size-4" />
											{labels.cancel}
										</Button>
									</>
								) : (
									<>
										<Button type="button" variant="ghost" size="sm" onClick={() => startEdit(type)} disabled={loading || type.status === "inactive"}>
											<Pencil className="size-4" />
											{labels.edit}
										</Button>
										<Button type="button" variant="ghost" size="sm" onClick={() => deactivateType(type.id)} disabled={loading || type.status === "inactive"}>
											<ShieldMinus className="size-4" />
											{labels.deactivate}
										</Button>
									</>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function usesStock(mode: MembershipMode) {
	return mode === "stock" || mode === "limited_stock";
}

function usesDuration(mode: MembershipMode) {
	return mode === "limited" || mode === "limited_stock";
}

function formatTypeLimits(type: MembershipType) {
	return [`stock ${type.default_stock ?? "-"}`, `days ${type.default_duration_days ?? "-"}`].join(" · ");
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
	const { Input, Label } = useClassManagementUi();

	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
		</div>
	);
}
