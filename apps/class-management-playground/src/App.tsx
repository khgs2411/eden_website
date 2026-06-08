import { classManagementPackageVersion } from "@eden/class-management-react";

export function App() {
	return (
		<main className="min-h-screen bg-background p-6 text-foreground">
			<h1 className="text-2xl font-bold">Class Management Playground</h1>
			<p className="mt-2 text-sm text-muted-foreground">Package version: {classManagementPackageVersion}</p>
		</main>
	);
}
