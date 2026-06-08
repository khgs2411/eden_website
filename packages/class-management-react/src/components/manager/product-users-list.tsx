import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type MembershipGrant, type MembershipLedgerEntry, type MembershipType, type ProductUserListItem } from "../../manager/manager-api";
import { useClassManagementUi } from "../../ui/ui-adapter";

const labels = {
	title: "Users",
	body: "Product users and platform admins who can access this product.",
	refresh: "Refresh",
	name: "Name",
	email: "Email",
	role: "Role",
	status: "Status",
	scope: "Scope",
	userId: "User ID",
	created: "Created",
	membershipTitle: "Membership",
	grants: "Grants",
	ledger: "Ledger",
	copy: "Copy",
	copied: "Copied.",
	noMembership: "No membership grants for this user.",
	noLedger: "No membership ledger entries.",
	empty: "No users found.",
	error: "Unable to load users.",
	membershipError: "Unable to load membership data.",
};

export function ProductUsersList() {
	const client = useClassManagementClient();
	const { Button } = useClassManagementUi();
	const [users, setUsers] = useState<ProductUserListItem[]>([]);
	const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const [grants, setGrants] = useState<MembershipGrant[]>([]);
	const [ledger, setLedger] = useState<MembershipLedgerEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [membershipLoading, setMembershipLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [membershipMessage, setMembershipMessage] = useState<string | null>(null);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const loadUsers = useCallback(async () => {
		setLoading(true);
		setMessage(null);
		try {
			const data = await callManagerApi<{ users: ProductUserListItem[] }>(client, "product-users", { action: "list" });
			setUsers(data.users);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		const timer = window.setTimeout(() => void loadUsers(), 0);
		return () => window.clearTimeout(timer);
	}, [loadUsers]);

	const loadMembershipData = useCallback(async (userId: string) => {
		setMembershipLoading(true);
		setMembershipMessage(null);
		try {
			const [typeData, grantData, ledgerData] = await Promise.all([
				callManagerApi<{ membership_types: MembershipType[] }>(client, "memberships", { action: "list_types" }),
				callManagerApi<{ membership_grants: MembershipGrant[] }>(client, "memberships", { action: "list_user_grants", user_id: userId }),
				callManagerApi<{ membership_ledger: MembershipLedgerEntry[] }>(client, "memberships", { action: "list_ledger", user_id: userId, limit: 25 }),
			]);
			setMembershipTypes(typeData.membership_types);
			setGrants(grantData.membership_grants);
			setLedger(ledgerData.membership_ledger);
		} catch (error) {
			setGrants([]);
			setLedger([]);
			setMembershipMessage(error instanceof Error ? error.message : labels.membershipError);
		} finally {
			setMembershipLoading(false);
		}
	}, [client]);

	function selectUser(user: ProductUserListItem) {
		setSelectedUserId(user.user_id);
		void loadMembershipData(user.user_id);
	}

	async function copyId(userId: string) {
		await navigator.clipboard.writeText(userId);
		setCopiedId(userId);
		window.setTimeout(() => setCopiedId((current) => (current === userId ? null : current)), 1500);
	}

	const selectedUser = users.find((user) => user.user_id === selectedUserId) ?? null;
	const typeNames = new Map(membershipTypes.map((type) => [type.id, type.name]));

	return (
		<section className="rounded-md border border-border bg-card p-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-display text-lg font-bold uppercase">{labels.title}</h2>
					<p className="text-sm text-muted-foreground">{labels.body}</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
					<RefreshCw className="size-4" />
					{labels.refresh}
				</Button>
			</div>

			{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

			<div className="mt-4 overflow-x-auto">
				<table className="w-full min-w-[760px] border-collapse text-sm">
					<thead>
						<tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
							<th className="py-2 pe-3 font-semibold">{labels.name}</th>
							<th className="py-2 pe-3 font-semibold">{labels.email}</th>
							<th className="py-2 pe-3 font-semibold">{labels.role}</th>
							<th className="py-2 pe-3 font-semibold">{labels.status}</th>
							<th className="py-2 pe-3 font-semibold">{labels.scope}</th>
							<th className="py-2 pe-3 font-semibold">{labels.userId}</th>
							<th className="py-2 font-semibold">{labels.created}</th>
						</tr>
					</thead>
					<tbody>
						{users.map((user) => (
							<tr
								key={`${user.scope}-${user.user_id}`}
								className={`cursor-pointer border-b border-border/70 align-top transition last:border-0 hover:bg-background ${selectedUserId === user.user_id ? "bg-background" : ""}`}
								onClick={() => selectUser(user)}
							>
								<td className="py-3 pe-3 font-medium">{user.display_name || "-"}</td>
								<td className="py-3 pe-3">{user.email || "-"}</td>
								<td className="py-3 pe-3">{user.role}</td>
								<td className="py-3 pe-3">{user.status}</td>
								<td className="py-3 pe-3">{user.scope}</td>
								<td className="py-3 pe-3">
									<div className="flex items-center gap-2">
										<span className="font-mono text-xs">{user.user_id}</span>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											aria-label={`${labels.copy} ${user.user_id}`}
											onClick={(event) => {
												event.stopPropagation();
												void copyId(user.user_id);
											}}
										>
											<Copy className="size-4" />
										</Button>
									</div>
								</td>
								<td className="py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{users.length === 0 && !loading && !message ? <p className="mt-4 text-sm text-muted-foreground">{labels.empty}</p> : null}
			{copiedId ? <p className="mt-3 text-sm text-muted-foreground">{labels.copied}</p> : null}
			{selectedUser ? (
				<div className="mt-5 rounded-md border border-border bg-background p-4">
					<div className="flex flex-col gap-1">
						<p className="font-display text-base font-bold uppercase">{labels.membershipTitle}</p>
						<p className="text-sm text-muted-foreground">
							{selectedUser.display_name || selectedUser.email || selectedUser.user_id} · {selectedUser.role} · {selectedUser.scope}
						</p>
					</div>
					{membershipMessage ? <p className="mt-3 text-sm text-muted-foreground">{membershipMessage}</p> : null}
					{membershipLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading membership data...</p> : null}
					<div className="mt-4 grid gap-4 lg:grid-cols-2">
						<div className="rounded-md border border-border bg-card p-3">
							<p className="text-sm font-semibold">{labels.grants}</p>
							<div className="mt-3 grid gap-2">
								{grants.map((grant) => (
									<div key={grant.id} className="rounded-md border border-border px-3 py-2 text-sm">
										<p className="font-medium">{typeNames.get(grant.membership_type_id) ?? grant.membership_type_id} · {grant.mode} · {grant.status}</p>
										<p className="mt-1 text-xs text-muted-foreground">{formatGrant(grant)}</p>
									</div>
								))}
								{grants.length === 0 && !membershipLoading ? <p className="text-sm text-muted-foreground">{labels.noMembership}</p> : null}
							</div>
						</div>
						<div className="rounded-md border border-border bg-card p-3">
							<p className="text-sm font-semibold">{labels.ledger}</p>
							<div className="mt-3 grid gap-2">
								{ledger.map((entry) => (
									<p key={entry.id} className="text-xs text-muted-foreground">
										{formatDate(entry.created_at)} · {entry.event_type} · {entry.stock_delta}
									</p>
								))}
								{ledger.length === 0 && !membershipLoading ? <p className="text-sm text-muted-foreground">{labels.noLedger}</p> : null}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}

function formatGrant(grant: MembershipGrant) {
	return [`from ${formatDate(grant.valid_from)}`, `until ${grant.valid_until ? formatDate(grant.valid_until) : "-"}`, `stock ${grant.remaining_stock ?? "-"} / ${grant.total_stock ?? "-"}`].join(" · ");
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
