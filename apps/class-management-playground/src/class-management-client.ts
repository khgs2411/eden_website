import { createClassManagementClient } from "@eden/class-management-react";

export const classManagementClient = createClassManagementClient({
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321",
	supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
	authStorageKey: "class-management-playground-auth",
});
