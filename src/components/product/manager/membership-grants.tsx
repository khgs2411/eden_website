import { RefreshCw, ShieldCheck, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callManagerApi, type MembershipGrant, type MembershipLedgerEntry, type MembershipType } from "@/components/product/manager/manager-api";

export function MembershipGrants({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
	const { t } = useTranslation();
	const [types, setTypes] = useState<MembershipType[]>([]);
	const [grants, setGrants] = useState<MembershipGrant[]>([]);
	const [ledger, setLedger] = useState<MembershipLedgerEntry[]>([]);
	const [userId, setUserId] = useState("");
	const [membershipTypeId, setMembershipTypeId] = useState("");
	const [validUntil, setValidUntil] = useState("");
	const [totalStock, setTotalStock] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const typeNames = useMemo(() => new Map(types.map((type) => [type.id, type.name])), [types]);
	const activeTypes = types.filter((type) => type.status === "active");

	const loadTypes = useCallback(async () => {
		const data = await callManagerApi<{ membership_types: MembershipType[] }>("memberships", { action: "list_types" });
		setTypes(data.membership_types);
		setMembershipTypeId((current) => current || data.membership_types.find((type) => type.status === "active")?.id || "");
	}, []);

	const loadUserMembership = useCallback(async () => {
		if (!userId.trim()) return;
		setLoading(true);
		setMessage(null);
		try {
			const [grantData, ledgerData] = await Promise.all([
				callManagerApi<{ membership_grants: MembershipGrant[] }>("memberships", { action: "list_user_grants", user_id: userId.trim() }),
				callManagerApi<{ membership_ledger: MembershipLedgerEntry[] }>("memberships", { action: "list_ledger", user_id: userId.trim(), limit: 25 }),
			]);
			setGrants(grantData.membership_grants);
			setLedger(ledgerData.membership_ledger);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}, [t, userId]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadTypes(), 0);
		return () => window.clearTimeout(timer);
	}, [loadTypes, refreshKey]);

	async function mutate(action: "grant" | "upgrade") {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("memberships", {
				action,
				user_id: userId.trim(),
				membership_type_id: membershipTypeId,
				valid_until: validUntil ? new Date(validUntil).toISOString() : null,
				total_stock: totalStock ? Number(totalStock) : null,
			});
			await loadUserMembership();
			onChanged();
			setMessage(t("managerOps.saved"));
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("managerOps.errors.generic"));
		} finally {
			setLoading(false);
		}
	}

	async function revoke(grantId: string) {
		setLoading(true);
		setMessage(null);
		try {
			await callManagerApi("memberships", { action: "revoke", membership_grant_id: grantId });
			await loadUserMembership();
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
					<h3 className="font-display text-lg font-bold uppercase">{t("managerOps.memberships.grantsTitle")}</h3>
					<p className="text-sm text-muted-foreground">{t("managerOps.memberships.upgradeNote")}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadUserMembership} disabled={loading || !userId.trim()}>
					<RefreshCw className="size-4" />
					{t("managerOps.refresh")}
				</Button>
			</div>
			<div className="mt-4 grid gap-3 rounded-md border border-border p-3 md:grid-cols-5">
				<TextField label={t("managerOps.memberships.userId")} value={userId} onChange={setUserId} />
				<div className="grid gap-2">
					<Label>{t("managerOps.memberships.type")}</Label>
					<select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={membershipTypeId} onChange={(event) => setMembershipTypeId(event.target.value)}>
						{activeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
					</select>
				</div>
				<TextField label={t("managerOps.memberships.validUntil")} type="date" value={validUntil} onChange={setValidUntil} />
				<TextField label={t("managerOps.memberships.totalStock")} type="number" value={totalStock} onChange={setTotalStock} />
				<div className="flex flex-wrap items-end gap-2">
					<Button type="button" onClick={() => mutate("grant")} disabled={loading || !userId.trim() || !membershipTypeId}>
						<ShieldCheck className="size-4" />
						{t("managerOps.memberships.grant")}
					</Button>
					<Button type="button" variant="outline" onClick={() => mutate("upgrade")} disabled={loading || !userId.trim() || !membershipTypeId}>
						{t("managerOps.memberships.upgrade")}
					</Button>
				</div>
			</div>
			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
			<div className="mt-4 grid gap-2">
				{grants.map((grant) => (
					<div key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
						<div>
							<p>{typeNames.get(grant.membership_type_id) ?? grant.membership_type_id} · {grant.mode} · {grant.status}</p>
							<p className="text-xs text-muted-foreground">{formatGrant(grant)}</p>
						</div>
						<Button type="button" variant="ghost" size="sm" onClick={() => revoke(grant.id)} disabled={loading || grant.status !== "active"}>
							<ShieldX className="size-4" />
							{t("managerOps.memberships.revoke")}
						</Button>
					</div>
				))}
			</div>
			<div className="mt-4 rounded-md border border-border p-3">
				<p className="text-sm font-medium">{t("managerOps.memberships.ledgerTitle")}</p>
				<div className="mt-3 grid gap-2">
					{ledger.map((entry) => (
						<p key={entry.id} className="text-xs text-muted-foreground">
							{formatDate(entry.created_at)} · {entry.event_type} · {entry.stock_delta}
						</p>
					))}
					{ledger.length === 0 ? <p className="text-xs text-muted-foreground">{t("managerOps.memberships.noLedger")}</p> : null}
				</div>
			</div>
		</div>
	);
}

function formatGrant(grant: MembershipGrant) {
	return [`from ${formatDate(grant.valid_from)}`, `until ${grant.valid_until ? formatDate(grant.valid_until) : "-"}`, `stock ${grant.remaining_stock ?? "-"} / ${grant.total_stock ?? "-"}`].join(" · ");
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
	return (
		<div className="grid gap-2">
			<Label>{label}</Label>
			<Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
		</div>
	);
}
