import { RefreshCw, ShieldMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callManagerApi, type MembershipMode, type MembershipType } from "@/components/product/manager/manager-api";

const modes: MembershipMode[] = ["stock", "limited_stock", "limited", "infinite"];

export function MembershipTypes({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
	const { t } = useTranslation();
	const [types, setTypes] = useState<MembershipType[]>([]);
	const [name, setName] = useState("");
	const [mode, setMode] = useState<MembershipMode>("stock");
	const [defaultStock, setDefaultStock] = useState("");
	const [defaultDurationDays, setDefaultDurationDays] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const loadTypes = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ membership_types: MembershipType[] }>("memberships", { action: "list_types" });
			setTypes(data.membership_types);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadTypes(), 0);
		return () => window.clearTimeout(timer);
	}, [loadTypes, refreshKey]);

	async function createType() {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("memberships", {
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
			setMessage(t("managerOps.saved"));
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function deactivateType(id: string) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("memberships", { action: "deactivate_type", membership_type_id: id });
			await loadTypes();
			onChanged();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="rounded-md border border-border bg-card p-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="font-display text-lg font-bold uppercase">{t("managerOps.memberships.typesTitle")}</h3>
					<p className="text-sm text-muted-foreground">{t("managerOps.memberships.modesNote")}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadTypes} disabled={loading}>
					<RefreshCw className="size-4" />
					{t("managerOps.refresh")}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 rounded-md border border-border p-3 md:grid-cols-4">
				<TextField label={t("managerOps.fields.name")} value={name} onChange={setName} />
				<div className="grid gap-2">
					<Label>{t("managerOps.memberships.mode")}</Label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as MembershipMode)}>
						{modes.map((item) => <option key={item} value={item}>{t(`managerOps.memberships.modes.${item}`)}</option>)}
					</select>
				</div>
				<TextField label={t("managerOps.memberships.defaultStock")} type="number" value={defaultStock} onChange={setDefaultStock} disabled={!usesStock(mode)} />
				<TextField label={t("managerOps.memberships.defaultDuration")} type="number" value={defaultDurationDays} onChange={setDefaultDurationDays} disabled={!usesDuration(mode)} />
				<div className="md:col-span-4">
					<Button type="button" onClick={createType} disabled={loading || name.trim().length === 0}>{t("managerOps.create")}</Button>
				</div>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{types.map((type) => (
					<div key={type.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
						<div>
							<p>{type.name} · {t(`managerOps.memberships.modes.${type.mode}`)} · {type.status}</p>
							<p className="text-xs text-muted-foreground">{formatTypeLimits(type)}</p>
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={() => deactivateType(type.id)} disabled={loading || type.status === "inactive"}>
							<ShieldMinus className="size-4" />
							{t("managerOps.deactivate")}
						</Button>
					</div>
				))}
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
	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
		</div>
	);
}
