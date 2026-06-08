import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useClassManagementClient } from "../../context/product-context-state";
import { callManagerApi, type ProductUserListItem } from "../../manager/manager-api";
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
	empty: "No users found.",
	error: "Unable to load users.",
};

export function ProductUsersList() {
	const client = useClassManagementClient();
	const { Button } = useClassManagementUi();
	const [users, setUsers] = useState<ProductUserListItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

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
							<tr key={`${user.scope}-${user.user_id}`} className="border-b border-border/70 align-top last:border-0">
								<td className="py-3 pe-3 font-medium">{user.display_name || "-"}</td>
								<td className="py-3 pe-3">{user.email || "-"}</td>
								<td className="py-3 pe-3">{user.role}</td>
								<td className="py-3 pe-3">{user.status}</td>
								<td className="py-3 pe-3">{user.scope}</td>
								<td className="py-3 pe-3 font-mono text-xs">{user.user_id}</td>
								<td className="py-3 text-xs text-muted-foreground">{formatDate(user.created_at)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{users.length === 0 && !loading && !message ? <p className="mt-4 text-sm text-muted-foreground">{labels.empty}</p> : null}
		</section>
	);
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
