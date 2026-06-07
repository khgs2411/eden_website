import { normalizeCustomDefaults, normalizeCustomFields } from "../_shared/class_schema.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type TemplateAction = "list" | "create" | "update" | "deactivate";
type Visibility = "public" | "hidden" | "members_only";
type RegistrationPolicy = "auto_approve" | "member_auto_approve" | "approval_required";
type MembershipRequirement = "none" | "required";

type TemplateRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: TemplateAction;
	id?: string;
	template_id?: string;
	name?: string;
	description?: string | null;
	category?: string | null;
	default_capacity?: number;
	default_location?: string | null;
	default_visibility?: Visibility;
	default_registration_policy?: RegistrationPolicy;
	default_membership_requirement?: MembershipRequirement;
	default_notes?: string | null;
	custom_fields?: unknown;
	custom_defaults?: unknown;
};

function requireString(value: unknown, field: string): string {
	if (!value || typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return value;
}

function optionalText(value: unknown, field: string): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} must be text.`);
	}

	return value;
}

function requirePositiveInteger(value: unknown, field: string): number {
	if (!Number.isInteger(value) || Number(value) <= 0) {
		throw new ApiError(400, "bad_request", `${field} must be a positive integer.`);
	}

	return Number(value);
}

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!allowed.includes(value as T)) {
		throw new ApiError(400, "bad_request", `${field} is not supported.`);
	}

	return value as T;
}

function rejectRegistrationAction(action: string | undefined): void {
	if (!action) {
		return;
	}

	if (action.includes("register") || action.includes("registration")) {
		throw new ApiError(400, "bad_request", "Users register for concrete classes through the registration API, not templates.");
	}
}

Deno.serve(async (req) => {
	const preflight = handleCors(req);
	if (preflight) {
		return preflight;
	}

	const origin = req.headers.get("Origin") ?? undefined;
	const headers = corsHeaders(origin);

	try {
		const body = await readJsonBody<TemplateRequest>(req);
		rejectRegistrationAction(body.action);
		const action = body.action ?? (body.name ? "create" : "list");
		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		if (action === "list") {
			const { data, error } = await supabase
				.from("class_templates")
				.select("*")
				.eq("product_id", ctx.product.id)
				.order("created_at", { ascending: false });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list class templates.");
			}

			return jsonOk({ templates: data }, { headers });
		}

		if (action === "create") {
			const customFields = normalizeCustomFields(body.custom_fields);
			const customDefaults = normalizeCustomDefaults(body.custom_defaults, customFields);

			const { data, error } = await supabase
				.from("class_templates")
				.insert({
					product_id: ctx.product.id,
					name: requireString(body.name, "name"),
					description: optionalText(body.description, "description"),
					category: optionalText(body.category, "category"),
					default_capacity: requirePositiveInteger(body.default_capacity, "default_capacity"),
					default_location: optionalText(body.default_location, "default_location"),
					default_visibility: optionalEnum(body.default_visibility, ["public", "hidden", "members_only"], "default_visibility") ?? "public",
					default_registration_policy: optionalEnum(body.default_registration_policy, ["auto_approve", "member_auto_approve", "approval_required"], "default_registration_policy") ?? "member_auto_approve",
					default_membership_requirement: optionalEnum(body.default_membership_requirement, ["none", "required"], "default_membership_requirement") ?? "none",
					default_notes: optionalText(body.default_notes, "default_notes"),
					custom_fields: customFields,
					custom_defaults: customDefaults,
				})
				.select("*")
				.single();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not create class template.");
			}

			return jsonOk({ template: data }, { headers });
		}

		if (action === "update") {
			const templateId = requireString(body.template_id ?? body.id, "template_id");
			const update: Record<string, unknown> = {};

			if (body.name !== undefined) update.name = requireString(body.name, "name");
			if (body.description !== undefined) update.description = optionalText(body.description, "description");
			if (body.category !== undefined) update.category = optionalText(body.category, "category");
			if (body.default_capacity !== undefined) update.default_capacity = requirePositiveInteger(body.default_capacity, "default_capacity");
			if (body.default_location !== undefined) update.default_location = optionalText(body.default_location, "default_location");
			if (body.default_visibility !== undefined) update.default_visibility = optionalEnum(body.default_visibility, ["public", "hidden", "members_only"], "default_visibility");
			if (body.default_registration_policy !== undefined) update.default_registration_policy = optionalEnum(body.default_registration_policy, ["auto_approve", "member_auto_approve", "approval_required"], "default_registration_policy");
			if (body.default_membership_requirement !== undefined) update.default_membership_requirement = optionalEnum(body.default_membership_requirement, ["none", "required"], "default_membership_requirement");
			if (body.default_notes !== undefined) update.default_notes = optionalText(body.default_notes, "default_notes");

			if (body.custom_fields !== undefined || body.custom_defaults !== undefined) {
				const { data: existing, error: existingError } = await supabase
					.from("class_templates")
					.select("custom_fields,custom_defaults")
					.eq("product_id", ctx.product.id)
					.eq("id", templateId)
					.maybeSingle();

				if (existingError) {
					throw new ApiError(500, "internal_error", "Could not load class template.");
				}

				if (!existing) {
					throw new ApiError(404, "not_found", "Class template was not found.");
				}

				const existingTemplate = existing as { custom_fields: unknown; custom_defaults: unknown };
				const customFields = normalizeCustomFields(body.custom_fields ?? existingTemplate.custom_fields);
				update.custom_fields = customFields;
				update.custom_defaults = normalizeCustomDefaults(body.custom_defaults ?? existingTemplate.custom_defaults, customFields);
			}

			const { data, error } = await supabase
				.from("class_templates")
				.update(update)
				.eq("product_id", ctx.product.id)
				.eq("id", templateId)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not update class template.");
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Class template was not found.");
			}

			return jsonOk({ template: data }, { headers });
		}

		if (action === "deactivate") {
			const templateId = requireString(body.template_id ?? body.id, "template_id");
			const { data, error } = await supabase
				.from("class_templates")
				.update({ status: "inactive" })
				.eq("product_id", ctx.product.id)
				.eq("id", templateId)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not deactivate class template.");
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Class template was not found.");
			}

			return jsonOk({ template: data }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported template action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
