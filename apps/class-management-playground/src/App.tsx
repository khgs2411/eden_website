import { ClassManagementUiProvider, createClassManagementClient } from "@eden/class-management-react";

const client = createClassManagementClient({
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
	supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
	productKey: import.meta.env.VITE_PRODUCT_KEY || "eden",
});

export function App() {
	return (
		<ClassManagementUiProvider>
			<main className="min-h-screen bg-background p-6 text-foreground">
				<h1 className="text-2xl font-bold">Class Management Playground</h1>
				<p className="mt-2 text-sm text-muted-foreground">Product key: {client?.productKey ?? "not configured"}</p>
			</main>
		</ClassManagementUiProvider>
	);
}
