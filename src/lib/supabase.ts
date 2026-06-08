import { createClassManagementClient } from "@eden/class-management-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const productKey = import.meta.env.VITE_PRODUCT_KEY || "eden";
export const supabaseAuthStorageKey = "eden-website-auth";

export const classManagementClient = createClassManagementClient({
	supabaseUrl,
	supabasePublishableKey,
	productKey,
	authStorageKey: supabaseAuthStorageKey,
});

export const supabase = classManagementClient?.supabase ?? null;

export function isSupabaseConfigured() {
	return supabase !== null;
}
