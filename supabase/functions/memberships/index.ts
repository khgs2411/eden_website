import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type MembershipMode = "stock" | "limited_stock" | "limited" | "infinite";
type MembershipTypeStatus = "active" | "inactive";
type MembershipGrantStatus =
	| "active"
	| "inactive"
	| "revoked"
	| "replaced"
	| "expired";
type MembershipEventType =
	| "membership_granted"
	| "membership_upgraded"
	| "membership_revoked"
	| "class_registration"
	| "registration_cancelled"
	| "class_cancelled_restore"
	| "manager_adjustment";

type MembershipAction =
	| "list_types"
	| "create_type"
	| "update_type"
	| "deactivate_type"
	| "grant"
	| "upgrade"
	| "revoke"
	| "list_user_grants"
	| "list_ledger";

type MembershipRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: MembershipAction;
	id?: string;
	name?: string;
	mode?: MembershipMode;
	default_stock?: number | null;
	default_duration_days?: number | null;
	user_id?: string;
	membership_type_id?: string;
	membership_grant_id?: string;
	valid_from?: string | null;
	valid_until?: string | null;
	total_stock?: number | null;
	limit?: number;
};

type MembershipTypeRow = {
	id: string;
	product_id: string;
	name: string;
	mode: MembershipMode;
	default_stock: number | null;
	default_duration_days: number | null;
	status: MembershipTypeStatus;
	created_at: string;
	updated_at: string;
};

type MembershipGrantRow = {
	id: string;
	product_id: string;
	user_id: string;
	membership_type_id: string;
	mode: MembershipMode;
	valid_from: string;
	valid_until: string | null;
	total_stock: number | null;
	remaining_stock: number | null;
	status: MembershipGrantStatus;
	created_at: string;
	updated_at: string;
};

type MembershipLedgerRow = {
	id: string;
	product_id: string;
	user_id: string;
	membership_grant_id: string | null;
	event_type: MembershipEventType;
	stock_delta: number;
	class_id: string | null;
	registration_id: string | null;
	metadata: Record<string, unknown>;
	created_by: string | null;
	created_at: string;
};

function requireString(value: unknown, field: string): string {
	if (!value || typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return value;
}

function optionalPositiveInteger(value: unknown, field: string): number | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (!Number.isInteger(value) || Number(value) <= 0) {
		throw new ApiError(400, "bad_request", `${field} must be a positive integer.`);
	}

	return Number(value);
}

function optionalIsoDate(value: unknown, field: string): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new ApiError(400, "bad_request", `${field} must be an ISO timestamp.`);
	}

	return value;
}

function requireMode(value: unknown): MembershipMode {
	if (
		value !== "stock" &&
		value !== "limited_stock" &&
		value !== "limited" &&
		value !== "infinite"
	) {
		throw new ApiError(400, "bad_request", "mode is required.");
	}

	return value;
}

function toApiError(error: { message?: string } | null, fallback: string): ApiError {
	const message = error?.message ?? fallback;

	if (message.includes("duplicate key") || message.includes("membership_grants_one_active_idx")) {
		return new ApiError(409, "conflict", "User already has an active membership grant.");
	}

	if (message.includes("not found") || message.includes("no active membership grant")) {
		return new ApiError(404, "not_found", message);
	}

	if (
		message.includes("require") ||
		message.includes("not an active product user") ||
		message.includes("higher mode")
	) {
		return new ApiError(400, "bad_request", message);
	}

	return new ApiError(500, "internal_error", fallback);
}

Deno.serve(async (req) => {
	const preflight = handleCors(req);
	if (preflight) {
		return preflight;
	}

	const origin = req.headers.get("Origin") ?? undefined;
	const headers = corsHeaders(origin);

	try {
		const body = await readJsonBody<MembershipRequest>(req);
		const action = body.action;

		if (!action || typeof action !== "string") {
			throw new ApiError(400, "bad_request", "action is required.");
		}

		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		if (action === "list_types") {
			const { data, error } = await supabase
				.from("membership_types")
				.select("*")
				.eq("product_id", ctx.product.id)
				.order("created_at", { ascending: false });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list membership types.");
			}

			return jsonOk({ membership_types: data as MembershipTypeRow[] }, { headers });
		}

		if (action === "create_type") {
			const name = requireString(body.name, "name");
			const mode = requireMode(body.mode);
			const defaultStock = optionalPositiveInteger(body.default_stock, "default_stock");
			const defaultDurationDays = optionalPositiveInteger(body.default_duration_days, "default_duration_days");

			const { data, error } = await supabase
				.from("membership_types")
				.insert({
					product_id: ctx.product.id,
					name,
					mode,
					default_stock: mode === "stock" || mode === "limited_stock" ? defaultStock : null,
					default_duration_days: mode === "limited" || mode === "limited_stock" ? defaultDurationDays : null,
				})
				.select("*")
				.single();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not create membership type.");
			}

			return jsonOk({ membership_type: data as MembershipTypeRow }, { headers });
		}

		if (action === "update_type") {
			const id = requireString(body.id ?? body.membership_type_id, "membership_type_id");
			const update: {
				name?: string;
				default_stock?: number | null;
				default_duration_days?: number | null;
			} = {};

			if (body.name !== undefined) {
				update.name = requireString(body.name, "name");
			}

			if (body.default_stock !== undefined) {
				update.default_stock = optionalPositiveInteger(body.default_stock, "default_stock");
			}

			if (body.default_duration_days !== undefined) {
				update.default_duration_days = optionalPositiveInteger(body.default_duration_days, "default_duration_days");
			}

			const { data, error } = await supabase
				.from("membership_types")
				.update(update)
				.eq("product_id", ctx.product.id)
				.eq("id", id)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not update membership type.");
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Membership type was not found.");
			}

			return jsonOk({ membership_type: data as MembershipTypeRow }, { headers });
		}

		if (action === "deactivate_type") {
			const id = requireString(body.id ?? body.membership_type_id, "membership_type_id");
			const { data, error } = await supabase
				.from("membership_types")
				.update({ status: "inactive" })
				.eq("product_id", ctx.product.id)
				.eq("id", id)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not deactivate membership type.");
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Membership type was not found.");
			}

			return jsonOk({ membership_type: data as MembershipTypeRow }, { headers });
		}

		if (action === "grant" || action === "upgrade") {
			const userId = requireString(body.user_id, "user_id");
			const membershipTypeId = requireString(body.membership_type_id, "membership_type_id");
			const validFrom = optionalIsoDate(body.valid_from, "valid_from");
			const validUntil = optionalIsoDate(body.valid_until, "valid_until");
			const totalStock = optionalPositiveInteger(body.total_stock, "total_stock");
			const rpcName = action === "grant" ? "grant_membership" : "upgrade_membership";
			const { data, error } = await supabase.rpc(rpcName, {
				p_product_id: ctx.product.id,
				p_user_id: userId,
				p_membership_type_id: membershipTypeId,
				p_valid_from: validFrom,
				p_valid_until: validUntil,
				p_total_stock: totalStock,
				p_created_by: ctx.user.id,
			});

			if (error) {
				throw toApiError(error, `Could not ${action} membership.`);
			}

			return jsonOk({ membership_grant: data as MembershipGrantRow }, { headers });
		}

		if (action === "revoke") {
			const membershipGrantId = requireString(body.membership_grant_id ?? body.id, "membership_grant_id");
			const { data, error } = await supabase.rpc("revoke_membership", {
				p_product_id: ctx.product.id,
				p_membership_grant_id: membershipGrantId,
				p_created_by: ctx.user.id,
			});

			if (error) {
				throw toApiError(error, "Could not revoke membership.");
			}

			return jsonOk({ membership_grant: data as MembershipGrantRow }, { headers });
		}

		if (action === "list_user_grants") {
			const userId = requireString(body.user_id, "user_id");
			const { data, error } = await supabase
				.from("membership_grants")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list membership grants.");
			}

			return jsonOk({ membership_grants: data as MembershipGrantRow[] }, { headers });
		}

		if (action === "list_ledger") {
			const userId = body.user_id && typeof body.user_id === "string" ? body.user_id : null;
			const limit = body.limit && Number.isInteger(body.limit) ? Math.min(Math.max(body.limit, 1), 100) : 50;
			let query = supabase
				.from("membership_ledger")
				.select("*")
				.eq("product_id", ctx.product.id)
				.order("created_at", { ascending: false })
				.limit(limit);

			if (userId) {
				query = query.eq("user_id", userId);
			}

			const { data, error } = await query;

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list membership ledger.");
			}

			return jsonOk({ membership_ledger: data as MembershipLedgerRow[] }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported membership action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
