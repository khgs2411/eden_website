import { ClassManagementUiProvider, ProductProvider, UserDashboard } from "@eden/class-management-react";
import { classManagementClient } from "./class-management-client";

export function App() {
	return (
		<ClassManagementUiProvider>
			<ProductProvider client={classManagementClient}>
				<main className="min-h-screen bg-background p-6 text-foreground">
					<div className="mx-auto max-w-5xl">
						<h1 className="text-2xl font-bold">Class Management Playground</h1>
						<UserDashboard />
					</div>
				</main>
			</ProductProvider>
		</ClassManagementUiProvider>
	);
}
