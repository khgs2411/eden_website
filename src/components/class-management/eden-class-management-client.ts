import { createClassManagementClient } from "@eden/class-management-react";

export const edenClassManagementClient = createClassManagementClient({
	supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
	supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
	productKey: import.meta.env.VITE_PRODUCT_KEY || "eden",
	authStorageKey: "eden-class-management-auth",
});
