import {
	normalizeCustomData,
	normalizeCustomDefaults,
	normalizeCustomFields,
	validateCustomData,
	type CustomField,
} from "../_shared/class_schema.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
	resolveAnonymousProductContext,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type ClassAction =
	| "list_public"
	| "list_user"
	| "list_manager"
	| "create"
	| "update"
	| "cancel"
	| "publish";
type Visibility = "public" | "hidden" | "members_only";
type RegistrationPolicy = "auto_approve" | "member_auto_approve" | "approval_required";
type MembershipRequirement = "none" | "required";
type PublicationStatus = "draft" | "published";

type ClassRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: string;
	id?: string;
	class_id?: string;
	template_id?: string | null;
	schedule_id?: string | null;
	generated_for_date?: string | null;
	source_timezone?: string | null;
	name?: string;
	description?: string | null;
	category?: string | null;
	starts_at?: string;
	ends_at?: string;
	capacity?: number;
	location?: string | null;
	status?: PublicationStatus;
	visibility?: Visibility;
	registration_policy?: RegistrationPolicy;
	membership_requirement?: MembershipRequirement;
	notes?: string | null;
	custom_data?: unknown;
};

type TemplateRow = {
	id: string;
	product_id: string;
	name: string;
	description: string | null;
	category: string | null;
	default_capacity: number;
	default_location: string | null;
	default_visibility: Visibility;
	default_registration_policy: RegistrationPolicy;
	default_membership_requirement: MembershipRequirement;
	default_notes: string | null;
	custom_fields: unknown;
	custom_defaults: unknown;
	status: "active" | "inactive";
};

type ClassRow = {
	id: string;
	template_id: string | null;
	starts_at: string;
	ends_at: string;
	custom_data: Record<string, unknown>;
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

function optionalUuidText(value: unknown, field: string): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	return requireString(value, field);
}

function optionalPositiveInteger(value: unknown, field: string): number | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!Number.isInteger(value) || Number(value) <= 0) {
		throw new ApiError(400, "bad_request", `${field} must be a positive integer.`);
	}

	return Number(value);
}

function requirePositiveInteger(value: unknown, field: string): number {
	const integer = optionalPositiveInteger(value, field);
	if (integer === undefined) {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return integer;
}

function requireIsoTimestamp(value: unknown, field: string): string {
	if (!value || typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new ApiError(400, "bad_request", `${field} must be an ISO timestamp.`);
	}

	return value;
}

function optionalIsoDate(value: unknown, field: string): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new ApiError(400, "bad_request", `${field} must be a date string.`);
	}

	return value;
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

function validateClassTime(startsAt: string, endsAt: string): void {
	if (Date.parse(endsAt) <= Date.parse(startsAt)) {
		throw new ApiError(400, "bad_request", "ends_at must be after starts_at.");
	}
}

async function loadTemplate(productId: string, templateId: string): Promise<{
	template: TemplateRow;
	fields: CustomField[];
	defaults: Record<string, unknown>;
}> {
	const supabase = getServiceClient();
	const { data, error } = await supabase
		.from("class_templates")
		.select("*")
		.eq("product_id", productId)
		.eq("id", templateId)
		.eq("status", "active")
		.maybeSingle();

	if (error) {
		throw new ApiError(500, "internal_error", "Could not load class template.");
	}

	if (!data) {
		throw new ApiError(404, "not_found", "Class template was not found.");
	}

	const template = data as TemplateRow;
	const fields = normalizeCustomFields(template.custom_fields);
	const defaults = normalizeCustomDefaults(template.custom_defaults, fields);

	return { template, fields, defaults };
}

function rejectRegistrationAction(action: string | undefined): void {
	if (!action) {
		return;
	}

	if (action.includes("register") || action.includes("registration")) {
		throw new ApiError(400, "bad_request", "Users register for concrete classes through the registration API, not templates or class core CRUD.");
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
		const body = await readJsonBody<ClassRequest>(req);
		rejectRegistrationAction(body.action);
		const action = (body.action ?? "list_public") as ClassAction;
		const supabase = getServiceClient();

		if (action === "list_public") {
			const ctx = await resolveAnonymousProductContext(req, body);
			const { data, error } = await supabase
				.from("classes")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("status", "published")
				.eq("lifecycle_status", "created")
				.eq("visibility", "public")
				.gte("starts_at", new Date().toISOString())
				.order("starts_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list classes.");
			}

			return jsonOk({ classes: data }, { headers });
		}

		if (action === "list_user") {
			const ctx = await requireProductContext(req, body);
			if (!ctx.productUser || ctx.productUser.status !== "active") {
				throw new ApiError(403, "forbidden", "Active product user access is required.");
			}

			const { data, error } = await supabase
				.from("classes")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("status", "published")
				.eq("lifecycle_status", "created")
				.in("visibility", ["public", "members_only"])
				.gte("starts_at", new Date().toISOString())
				.order("starts_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list classes.");
			}

			const classIds = (data ?? []).map((row: { id: string }) => row.id);
			const registrationsByClassId = new Map<string, unknown>();

			if (classIds.length > 0) {
				const { data: registrations, error: registrationsError } = await supabase
					.from("class_registrations")
					.select("*")
					.eq("product_id", ctx.product.id)
					.eq("user_id", ctx.user.id)
					.in("class_id", classIds)
					.in("status", ["pending", "approved"]);

				if (registrationsError) {
					throw new ApiError(500, "internal_error", "Could not load registration status.");
				}

				for (const registration of registrations ?? []) {
					registrationsByClassId.set(registration.class_id, registration);
				}
			}

			return jsonOk({
				classes: (data ?? []).map((classRow: { id: string }) => ({
					...classRow,
					user_registration: registrationsByClassId.get(classRow.id) ?? null,
				})),
			}, { headers });
		}

		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);

		if (action === "list_manager") {
			const { data, error } = await supabase
				.from("classes")
				.select("*")
				.eq("product_id", ctx.product.id)
				.order("starts_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list classes.");
			}

			return jsonOk({ classes: data }, { headers });
		}

		if (action === "create") {
			const templateId = optionalUuidText(body.template_id, "template_id");
			const templateData = templateId ? await loadTemplate(ctx.product.id, templateId) : null;
			const startsAt = requireIsoTimestamp(body.starts_at, "starts_at");
			const endsAt = requireIsoTimestamp(body.ends_at, "ends_at");
			validateClassTime(startsAt, endsAt);

			const customInput = normalizeCustomData(body.custom_data);
			const customData = templateData
				? validateCustomData(templateData.fields, templateData.defaults, customInput)
				: customInput;
			const template = templateData?.template;
			const name = body.name !== undefined ? requireString(body.name, "name") : template?.name;
			const capacity = body.capacity !== undefined ? requirePositiveInteger(body.capacity, "capacity") : template?.default_capacity;

			if (!name) {
				throw new ApiError(400, "bad_request", "name is required.");
			}

			if (!capacity) {
				throw new ApiError(400, "bad_request", "capacity is required.");
			}

			const { data, error } = await supabase
				.from("classes")
				.insert({
					product_id: ctx.product.id,
					template_id: templateId,
					schedule_id: optionalUuidText(body.schedule_id, "schedule_id"),
					generated_for_date: optionalIsoDate(body.generated_for_date, "generated_for_date"),
					source_timezone: optionalText(body.source_timezone, "source_timezone"),
					name,
					description: body.description !== undefined ? optionalText(body.description, "description") : template?.description,
					category: body.category !== undefined ? optionalText(body.category, "category") : template?.category,
					starts_at: startsAt,
					ends_at: endsAt,
					capacity,
					location: body.location !== undefined ? optionalText(body.location, "location") : template?.default_location,
					status: optionalEnum(body.status, ["draft", "published"], "status") ?? "draft",
					visibility: optionalEnum(body.visibility, ["public", "hidden", "members_only"], "visibility") ?? template?.default_visibility ?? "public",
					registration_policy: optionalEnum(body.registration_policy, ["auto_approve", "member_auto_approve", "approval_required"], "registration_policy") ?? template?.default_registration_policy ?? "member_auto_approve",
					membership_requirement: optionalEnum(body.membership_requirement, ["none", "required"], "membership_requirement") ?? template?.default_membership_requirement ?? "none",
					notes: body.notes !== undefined ? optionalText(body.notes, "notes") : template?.default_notes,
					custom_data: customData,
				})
				.select("*")
				.single();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not create class.");
			}

			return jsonOk({ class: data }, { headers });
		}

		if (action === "update") {
			const classId = requireString(body.class_id ?? body.id, "class_id");
			const { data: existing, error: existingError } = await supabase
				.from("classes")
				.select("id,template_id,starts_at,ends_at,custom_data")
				.eq("product_id", ctx.product.id)
				.eq("id", classId)
				.maybeSingle();

			if (existingError) {
				throw new ApiError(500, "internal_error", "Could not load class.");
			}

			if (!existing) {
				throw new ApiError(404, "not_found", "Class was not found.");
			}

			const existingClass = existing as ClassRow;
			const update: Record<string, unknown> = {};

			if (body.template_id !== undefined) update.template_id = optionalUuidText(body.template_id, "template_id");
			if (body.schedule_id !== undefined) update.schedule_id = optionalUuidText(body.schedule_id, "schedule_id");
			if (body.generated_for_date !== undefined) update.generated_for_date = optionalIsoDate(body.generated_for_date, "generated_for_date");
			if (body.source_timezone !== undefined) update.source_timezone = optionalText(body.source_timezone, "source_timezone");
			if (body.name !== undefined) update.name = requireString(body.name, "name");
			if (body.description !== undefined) update.description = optionalText(body.description, "description");
			if (body.category !== undefined) update.category = optionalText(body.category, "category");
			if (body.starts_at !== undefined) update.starts_at = requireIsoTimestamp(body.starts_at, "starts_at");
			if (body.ends_at !== undefined) update.ends_at = requireIsoTimestamp(body.ends_at, "ends_at");
			if (body.capacity !== undefined) update.capacity = requirePositiveInteger(body.capacity, "capacity");
			if (body.location !== undefined) update.location = optionalText(body.location, "location");
			if (body.status !== undefined) update.status = optionalEnum(body.status, ["draft", "published"], "status");
			if (body.visibility !== undefined) update.visibility = optionalEnum(body.visibility, ["public", "hidden", "members_only"], "visibility");
			if (body.registration_policy !== undefined) update.registration_policy = optionalEnum(body.registration_policy, ["auto_approve", "member_auto_approve", "approval_required"], "registration_policy");
			if (body.membership_requirement !== undefined) update.membership_requirement = optionalEnum(body.membership_requirement, ["none", "required"], "membership_requirement");
			if (body.notes !== undefined) update.notes = optionalText(body.notes, "notes");

			if (update.starts_at || update.ends_at) {
				const startsAt = (update.starts_at as string | undefined) ?? existingClass.starts_at;
				const endsAt = (update.ends_at as string | undefined) ?? existingClass.ends_at;
				validateClassTime(startsAt, endsAt);
			}

			if (body.custom_data !== undefined || body.template_id !== undefined) {
				const nextTemplateId = body.template_id !== undefined ? (update.template_id as string | null) : existingClass.template_id;
				const customInput = {
					...(existingClass.custom_data ?? {}),
					...normalizeCustomData(body.custom_data),
				};

				if (nextTemplateId) {
					const templateData = await loadTemplate(ctx.product.id, nextTemplateId);
					update.custom_data = validateCustomData(templateData.fields, templateData.defaults, customInput);
				} else {
					update.custom_data = customInput;
				}
			}

			const { data, error } = await supabase
				.from("classes")
				.update(update)
				.eq("product_id", ctx.product.id)
				.eq("id", classId)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not update class.");
			}

			return jsonOk({ class: data }, { headers });
		}

		if (action === "cancel" || action === "publish") {
			const classId = requireString(body.class_id ?? body.id, "class_id");

			const { data, error } = action === "cancel"
				? await supabase.rpc("cancel_class_with_registration_restoration", {
					p_product_id: ctx.product.id,
					p_class_id: classId,
					p_created_by: ctx.user.id,
				})
				: await supabase
					.from("classes")
					.update({ status: "published" })
					.eq("product_id", ctx.product.id)
					.eq("id", classId)
					.select("*")
					.maybeSingle();

			if (error) {
				if (action === "cancel" && error.message?.includes("class_not_found")) {
					throw new ApiError(404, "not_found", "Class was not found.");
				}

				throw new ApiError(500, "internal_error", `Could not ${action} class.`);
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Class was not found.");
			}

			return jsonOk({ class: data }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported class action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
