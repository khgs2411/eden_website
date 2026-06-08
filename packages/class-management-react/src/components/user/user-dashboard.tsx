import { AuthPanel, type AuthPanelLabels } from "../auth-panel";
import { useProductContext } from "../../context/product-context-state";
import { ClassList, type ClassListLabels } from "./class-list";

export type UserDashboardLabels = {
	loading?: string;
	productKey?: (productKey: string) => string;
	anonymousRole?: string;
	activeRole?: string;
	inactiveRole?: string;
	errorPrefix?: string;
	auth?: AuthPanelLabels;
	classes?: ClassListLabels;
};

const defaultLabels = {
	loading: "Loading product context...",
	productKey: (productKey: string) => `Product key: ${productKey}`,
	anonymousRole: "Sign in to access member registration.",
	activeRole: "Active product user",
	inactiveRole: "Your product access is inactive.",
	errorPrefix: "Product error",
} satisfies Omit<Required<UserDashboardLabels>, "auth" | "classes">;

export function UserDashboard({ labels: labelOverrides }: { labels?: UserDashboardLabels } = {}) {
	const labels = { ...defaultLabels, ...labelOverrides };
	const { productKey, product, productUser, loading, error } = useProductContext();
	const hasActiveProductUser = productUser?.status === "active";

	return (
		<div className="mt-6 grid gap-5">
			<div className="rounded-md border border-border bg-card p-4 text-card-foreground">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						{loading ? <p className="text-sm text-muted-foreground">{labels.loading}</p> : null}
						{product ? <h2 className="font-display text-2xl font-bold uppercase">{product.name}</h2> : null}
						<p className="mt-1 text-sm text-muted-foreground">
							{productUser ? (hasActiveProductUser ? labels.activeRole : labels.inactiveRole) : labels.anonymousRole}
						</p>
					</div>
					<div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">{labels.productKey(productKey)}</div>
				</div>

				{error ? (
					<p className="mt-4 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
						{labels.errorPrefix}: {error}
					</p>
				) : null}

				<div className="mt-5">
					<AuthPanel labels={labelOverrides?.auth} />
				</div>
			</div>

			<ClassList labels={labelOverrides?.classes} />
		</div>
	);
}
