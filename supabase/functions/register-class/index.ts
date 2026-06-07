import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type RegistrationAction = "register" | "cancel";

type RegistrationRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: RegistrationAction;
	class_id?: string;
	registration_id?: string;
};

type RegistrationRow = {
	id: string;
	product_id: string;
	class_id: string;
	user_id: string;
	status: "pending" | "approved" | "rejected" | "cancelled";
	membership_grant_id: string | null;
	stock_consumed: number;
	approved_at: string | null;
	cancelled_at: string | null;
	created_at: string;
	updated_at: string;
};

function requireString(value: unknown, field: string): string {
	if (!value || typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return value;
}

function toApiError(error: { message?: string } | null, fallback: string): ApiError {
	const message = error?.message ?? fallback;

	if (message.includes("registration_already_exists") || message.includes("duplicate key")) {
		return new ApiError(409, "conflict", "A live registration already exists for this class.");
	}

	if (message.includes("class_not_found") || message.includes("registration_not_found")) {
		return new ApiError(404, "not_found", "Registration target was not found.");
	}

	if (
		message.includes("class_not_registerable") ||
		message.includes("product_user_not_found") ||
		message.includes("membership_required") ||
		message.includes("membership_stock_depleted") ||
		message.includes("class_capacity_full")
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
		const body = await readJsonBody<RegistrationRequest>(req);
		const action = body.action ?? "register";
		const ctx = await requireProductContext(req, body);
		const supabase = getServiceClient();

		if (!ctx.productUser || ctx.productUser.status !== "active") {
			throw new ApiError(403, "forbidden", "Active product user access is required.");
		}

		if (action === "register") {
			const classId = requireString(body.class_id, "class_id");
			const { data, error } = await supabase.rpc("register_for_class", {
				p_product_id: ctx.product.id,
				p_class_id: classId,
				p_user_id: ctx.user.id,
			});

			if (error) {
				throw toApiError(error, "Could not register for class.");
			}

			const registration = data as RegistrationRow;
			return jsonOk({
				registration_id: registration.id,
				status: registration.status,
				stock_consumed: registration.stock_consumed,
				registration,
			}, { headers });
		}

		if (action === "cancel") {
			const registrationId = requireString(body.registration_id, "registration_id");
			const { data, error } = await supabase.rpc("cancel_class_registration", {
				p_product_id: ctx.product.id,
				p_registration_id: registrationId,
				p_user_id: ctx.user.id,
				p_created_by: ctx.user.id,
				p_force_restore: false,
			});

			if (error) {
				throw toApiError(error, "Could not cancel registration.");
			}

			const registration = data as RegistrationRow;
			return jsonOk({
				registration_id: registration.id,
				status: registration.status,
				stock_consumed: registration.stock_consumed,
				registration,
			}, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported registration action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
