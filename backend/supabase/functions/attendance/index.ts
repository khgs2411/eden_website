import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type AttendanceAction = "list_class" | "start" | "update_attendance" | "add_walk_in" | "add_trial" | "complete";
type AttendanceStatus = "present" | "absent";

type AttendanceRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: AttendanceAction;
	class_id?: string;
	participant_id?: string;
	user_id?: string;
	trial_name?: string;
	trial_contact?: string | null;
	attendance_status?: AttendanceStatus;
	default_attendance_status?: AttendanceStatus;
};

type ClassRow = {
	id: string;
	product_id: string;
	lifecycle_status: "created" | "cancelled" | "in_progress" | "completed";
};

type ParticipantRow = {
	id: string;
	product_id: string;
	class_id: string;
	participant_kind: "registered" | "walk_in" | "trial";
	user_id: string | null;
	registration_id: string | null;
	trial_name: string | null;
	trial_contact: string | null;
	attendance_status: AttendanceStatus;
	created_at: string;
	updated_at: string;
};

function requireString(value: unknown, field: string): string {
	if (!value || typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return value;
}

function optionalAttendanceStatus(value: unknown, field: string, fallback: AttendanceStatus): AttendanceStatus {
	if (value === undefined) {
		return fallback;
	}

	if (value !== "present" && value !== "absent") {
		throw new ApiError(400, "bad_request", `${field} must be present or absent.`);
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

function toApiError(error: { message?: string } | null, fallback: string): ApiError {
	const message = error?.message ?? fallback;

	if (message.includes("class_not_found") || message.includes("participant_not_found")) {
		return new ApiError(404, "not_found", "Attendance target was not found.");
	}

	if (message.includes("participant_already_exists") || message.includes("duplicate key")) {
		return new ApiError(409, "conflict", "Participant already exists for this class.");
	}

	if (
		message.includes("unsupported_attendance_status") ||
		message.includes("class_lifecycle_not_startable") ||
		message.includes("class_not_published") ||
		message.includes("class_attendance_not_started") ||
		message.includes("product_user_not_found") ||
		message.includes("walk_in_has_live_registration") ||
		message.includes("trial_name_required") ||
		message.includes("class_lifecycle_not_completable")
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
		const body = await readJsonBody<AttendanceRequest>(req);
		const action = body.action;

		if (!action || typeof action !== "string") {
			throw new ApiError(400, "bad_request", "action is required.");
		}

		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		if (action === "list_class") {
			const classId = requireString(body.class_id, "class_id");
			const { data, error } = await supabase
				.from("class_participants")
				.select("*")
				.eq("product_id", ctx.product.id)
				.eq("class_id", classId)
				.order("created_at", { ascending: true });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list class participants.");
			}

			return jsonOk({ participants: data as ParticipantRow[] }, { headers });
		}

		if (action === "start") {
			const classId = requireString(body.class_id, "class_id");
			const defaultAttendanceStatus = optionalAttendanceStatus(body.default_attendance_status, "default_attendance_status", "absent");
			const { data, error } = await supabase.rpc("start_class_attendance", {
				p_product_id: ctx.product.id,
				p_class_id: classId,
				p_default_attendance_status: defaultAttendanceStatus,
			});

			if (error) {
				throw toApiError(error, "Could not start class attendance.");
			}

			return jsonOk({ class: data as ClassRow }, { headers });
		}

		if (action === "update_attendance") {
			const participantId = requireString(body.participant_id, "participant_id");
			const attendanceStatus = optionalAttendanceStatus(body.attendance_status, "attendance_status", "absent");
			const { data, error } = await supabase.rpc("update_class_participant_attendance", {
				p_product_id: ctx.product.id,
				p_participant_id: participantId,
				p_attendance_status: attendanceStatus,
			});

			if (error) {
				throw toApiError(error, "Could not update participant attendance.");
			}

			return jsonOk({ participant: data as ParticipantRow }, { headers });
		}

		if (action === "add_walk_in") {
			const classId = requireString(body.class_id, "class_id");
			const userId = requireString(body.user_id, "user_id");
			const attendanceStatus = optionalAttendanceStatus(body.attendance_status, "attendance_status", "present");
			const { data, error } = await supabase.rpc("add_class_walk_in", {
				p_product_id: ctx.product.id,
				p_class_id: classId,
				p_user_id: userId,
				p_attendance_status: attendanceStatus,
			});

			if (error) {
				throw toApiError(error, "Could not add walk-in participant.");
			}

			return jsonOk({ participant: data as ParticipantRow }, { headers });
		}

		if (action === "add_trial") {
			const classId = requireString(body.class_id, "class_id");
			const trialName = requireString(body.trial_name, "trial_name");
			const trialContact = optionalText(body.trial_contact, "trial_contact");
			const { data, error } = await supabase.rpc("add_class_trial_participant", {
				p_product_id: ctx.product.id,
				p_class_id: classId,
				p_trial_name: trialName,
				p_trial_contact: trialContact,
			});

			if (error) {
				throw toApiError(error, "Could not add trial participant.");
			}

			return jsonOk({ participant: data as ParticipantRow }, { headers });
		}

		if (action === "complete") {
			const classId = requireString(body.class_id, "class_id");
			const { data, error } = await supabase.rpc("complete_class_attendance", {
				p_product_id: ctx.product.id,
				p_class_id: classId,
			});

			if (error) {
				throw toApiError(error, "Could not complete class attendance.");
			}

			return jsonOk({ class: data as ClassRow }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported attendance action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
