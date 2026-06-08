import { useState } from "react";
import { ClassManagementUiProvider, ManagerClassDashboard, ManagerOperationsDashboard, ProductProvider, UserDashboard, useProductContext } from "@eden/class-management-react";
import { classManagementClient } from "./class-management-client";

type PlaygroundPage = "classes" | "templates" | "schedules";

const pages = [
	{ id: "classes", label: "Classes" },
	{ id: "templates", label: "Templates" },
	{ id: "schedules", label: "Schedules" },
] satisfies { id: PlaygroundPage; label: string }[];

export function App() {
	const [page, setPage] = useState<PlaygroundPage>("classes");

	return (
		<ClassManagementUiProvider>
			<ProductProvider client={classManagementClient}>
				<main className="min-h-screen bg-background px-5 py-6 text-foreground">
					<div className="mx-auto grid max-w-6xl gap-6">
						<header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Domain-resolved consumer app</p>
								<h1 className="mt-1 text-3xl font-bold tracking-normal">Class Management Playground</h1>
							</div>
							<nav className="flex flex-wrap gap-2" aria-label="Playground pages">
								{pages.map((item) => (
									<button
										key={item.id}
										type="button"
										className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
											page === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary"
										}`}
										onClick={() => setPage(item.id)}
									>
										{item.label}
									</button>
								))}
							</nav>
						</header>
						<PlaygroundDashboard page={page} />
					</div>
				</main>
			</ProductProvider>
		</ClassManagementUiProvider>
	);
}

function PlaygroundDashboard({ page }: { page: PlaygroundPage }) {
	const { productUser } = useProductContext();
	const canManage = productUser?.status === "active" && (productUser.role === "manager" || productUser.role === "admin");

	return (
		<div className="grid gap-6">
			{page === "classes" ? <UserDashboard /> : null}
			{canManage && page === "templates" ? <ManagerClassDashboard view="templates" /> : null}
			{canManage && page === "schedules" ? <ManagerClassDashboard view="schedules" /> : null}
			{canManage && page === "classes" ? <ManagerClassDashboard view="classes" /> : null}
			{canManage && page === "classes" ? <ManagerOperationsDashboard view="attendance" /> : null}
			{canManage && page === "templates" ? <ManagerOperationsDashboard view="memberships" /> : null}
		</div>
	);
}
