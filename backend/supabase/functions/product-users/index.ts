import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type ProductUsersRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: "list";
};

type ProductUserRow = {
	user_id: string;
	role: "manager" | "user";
	status: "active" | "inactive";
	created_at: string;
	updated_at: string;
};

type PlatformAdminRow = {
	user_id: string;
	created_at: string;
};

type ProfileRow = {
	user_id: string;
	display_name: string | null;
};

async function loadEmail(userId: string): Promise<string | null> {
	const supabase = getServiceClient();
	const { data, error } = await supabase.auth.admin.getUserById(userId);

	if (error) {
		return null;
	}

	return data.user?.email ?? null;
}

Deno.serve(async (req) => {
	const preflight = handleCors(req);
	if (preflight) {
		return preflight;
	}

	const origin = req.headers.get("Origin") ?? undefined;
	const headers = corsHeaders(origin);

	try {
		const body = await readJsonBody<ProductUsersRequest>(req);
		const action = body.action ?? "list";

		if (action !== "list") {
			throw new ApiError(400, "bad_request", "Unsupported product user action.");
		}

		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		const [{ data: productUsers, error: productUsersError }, { data: platformAdmins, error: platformAdminsError }] = await Promise.all([
			supabase
				.from("product_users")
				.select("user_id,role,status,created_at,updated_at")
				.eq("product_id", ctx.product.id)
				.order("created_at", { ascending: false }),
			supabase
				.from("platform_admins")
				.select("user_id,created_at")
				.order("created_at", { ascending: false }),
		]);

		if (productUsersError) {
			throw new ApiError(500, "internal_error", "Could not list product users.");
		}

		if (platformAdminsError) {
			throw new ApiError(500, "internal_error", "Could not list platform admins.");
		}

		const productRows = (productUsers ?? []) as ProductUserRow[];
		const adminRows = (platformAdmins ?? []) as PlatformAdminRow[];
		const adminUserIds = new Set(adminRows.map((row) => row.user_id));
		const userIds = [...new Set([...productRows.map((row) => row.user_id), ...adminRows.map((row) => row.user_id)])];
		const { data: profiles, error: profilesError } = userIds.length > 0
			? await supabase
				.from("profiles")
				.select("user_id,display_name")
				.in("user_id", userIds)
			: { data: [], error: null };

		if (profilesError) {
			throw new ApiError(500, "internal_error", "Could not list user profiles.");
		}

		const profileNames = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.user_id, profile.display_name]));

		const users = await Promise.all([
			...productRows.map(async (row) => ({
				user_id: row.user_id,
				email: await loadEmail(row.user_id),
				display_name: profileNames.get(row.user_id) ?? null,
				role: adminUserIds.has(row.user_id) ? "admin" as const : row.role,
				status: adminUserIds.has(row.user_id) ? "active" as const : row.status,
				scope: adminUserIds.has(row.user_id) ? "platform" as const : "product" as const,
				created_at: row.created_at,
				updated_at: row.updated_at,
			})),
			...adminRows
				.filter((row) => !productRows.some((productRow) => productRow.user_id === row.user_id))
				.map(async (row) => ({
					user_id: row.user_id,
					email: await loadEmail(row.user_id),
					display_name: profileNames.get(row.user_id) ?? null,
					role: "admin" as const,
					status: "active" as const,
					scope: "platform" as const,
					created_at: row.created_at,
					updated_at: row.created_at,
				})),
		]);

		return jsonOk({ users }, { headers });
	} catch (error) {
		return errorResponse(error, headers);
	}
});
