import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type ClassManagementClientConfig = {
	supabaseUrl?: string | null;
	supabasePublishableKey?: string | null;
	productKey?: string | null;
	authStorageKey?: string;
};

export type ClassManagementClient = {
	supabase: SupabaseClient;
	productKey?: string;
	authStorageKey: string;
};

export function hasClassManagementClientConfig(
	config: ClassManagementClientConfig,
): config is ClassManagementClientConfig & { supabaseUrl: string; supabasePublishableKey: string } {
	return Boolean(config.supabaseUrl && config.supabasePublishableKey);
}

export function createClassManagementClient(config: ClassManagementClientConfig): ClassManagementClient | null {
	if (!hasClassManagementClientConfig(config)) return null;

	const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
		auth: {
			storageKey: config.authStorageKey ?? `class-management-${config.productKey ?? "domain"}-auth`,
		},
	});

	return {
		supabase,
		productKey: config.productKey ?? undefined,
		authStorageKey: config.authStorageKey ?? `class-management-${config.productKey ?? "domain"}-auth`,
	};
}
