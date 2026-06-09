import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type ManagerRegistrationAction = "list_pending" | "list_class" | "approve" | "reject" | "cancel" | "approve_rejected" | "allow_reregister";

type ManagerRegistrationRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: ManagerRegistrationAction;
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

	if (message.includes("registration_not_found") || message.includes("class_not_found")) {
		return new ApiError(404, "not_found", "Registration target was not found.");
	}

	if (message.includes("registration_live_replacement_exists")) {
		return new ApiError(409, "conflict", "A live registration already exists for this user and class.");
	}

	if (
		message.includes("registration_not_pending") ||
		message.includes("registration_not_rejected") ||
		message.includes("registration_not_cancellable") ||
		message.includes("unsupported_registration_action") ||
		message.includes("class_not_registerable") ||
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
		const body = await readJsonBody<ManagerRegistrationRequest>(req);
		const action = body.action;

		if (!action || typeof action !== "string") {
			throw new ApiError(400, "bad_request", "action is required.");
		}

		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		if (action === "list_pending") {
			const { data, error } = await supabase
				.from("class_registrations")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("status", "pending")
				.order("created_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list pending registrations.");
			}

			return jsonOk({ registrations: data as RegistrationRow[] }, { headers });
		}

		if (action === "list_class") {
			const classId = requireString(body.class_id, "class_id");
			const { data, error } = await supabase
				.from("class_registrations")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("class_id", classId)
				.order("created_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list class registrations.");
			}

			return jsonOk({ registrations: data as RegistrationRow[] }, { headers });
		}

		if (action === "approve" || action === "reject" || action === "cancel" || action === "approve_rejected" || action === "allow_reregister") {
			const registrationId = requireString(body.registration_id, "registration_id");
			const { data, error } = await supabase.rpc("manage_class_registration", {
				p_product_id: ctx.product.id,
				p_registration_id: registrationId,
				p_action: action,
				p_created_by: ctx.user.id,
			});

			if (error) {
				throw toApiError(error, `Could not ${action} registration.`);
			}

			return jsonOk({ registration: data as RegistrationRow }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported registration action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
