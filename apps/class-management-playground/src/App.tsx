import { ClassManagementUiProvider, ManagerClassDashboard, ManagerOperationsDashboard, ProductProvider, UserDashboard, useProductContext } from "@eden/class-management-react";
import { classManagementClient } from "./class-management-client";

export function App() {
	return (
		<ClassManagementUiProvider>
			<ProductProvider client={classManagementClient}>
				<main className="min-h-screen bg-background p-6 text-foreground">
					<div className="mx-auto max-w-5xl">
						<h1 className="text-2xl font-bold">Class Management Playground</h1>
						<PlaygroundDashboard />
					</div>
				</main>
			</ProductProvider>
		</ClassManagementUiProvider>
	);
}

function PlaygroundDashboard() {
	const { productUser } = useProductContext();
	const isActiveManager = productUser?.role === "manager" && productUser.status === "active";

	return (
		<>
			<UserDashboard />
			{isActiveManager ? (
				<>
					<ManagerClassDashboard />
					<ManagerOperationsDashboard />
				</>
			) : null}
		</>
	);
}
