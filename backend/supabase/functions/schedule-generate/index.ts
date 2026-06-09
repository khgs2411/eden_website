import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type GenerateRequest = {
	[key: string]: unknown;
	product_key?: string;
	schedule_id?: string | null;
	generation_count?: unknown;
};

type GenerationCounts = {
	created_count: number;
	existing_count: number;
	skipped_count: number;
};

type ScheduleStatusRow = {
	status: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalScheduleId(value: unknown): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== "string" || !uuidPattern.test(value)) {
		throw new ApiError(400, "bad_request", "schedule_id must be a UUID string.");
	}

	return value;
}

function optionalGenerationCount(value: unknown): number | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value === "number") {
		if (!Number.isInteger(value) || value < 1 || value > 52) {
			throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
		}

		return value;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!/^\d+$/.test(trimmed)) {
			throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
		}

		const parsed = Number(trimmed);
		if (!Number.isInteger(parsed) || parsed < 1 || parsed > 52) {
			throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
		}

		return parsed;
	}

	throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
}

Deno.serve(async (req) => {
	const preflight = handleCors(req);
	if (preflight) {
		return preflight;
	}

	const origin = req.headers.get("Origin") ?? undefined;
	const headers = corsHeaders(origin);

	try {
		const body = await readJsonBody<GenerateRequest>(req);
		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const scheduleId = optionalScheduleId(body.schedule_id);
		const generationCount = optionalGenerationCount(body.generation_count);
		const supabase = getServiceClient();

		if (scheduleId) {
			const { data: schedule, error: scheduleError } = await supabase
				.from("schedules")
				.select("status")
				.eq("product_id", ctx.product.id)
				.eq("id", scheduleId)
				.maybeSingle();

			if (scheduleError) {
				throw new ApiError(500, "internal_error", "Could not load schedule.");
			}

			if (!schedule) {
				throw new ApiError(404, "not_found", "Schedule was not found.");
			}

			if ((schedule as ScheduleStatusRow).status !== "active") {
				throw new ApiError(409, "conflict", "Activate the schedule before generating classes.");
			}
		}

		const { data, error } = await supabase.rpc("generate_schedule_classes", {
			p_product_id: ctx.product.id,
			p_schedule_id: scheduleId,
			p_generation_count: generationCount,
		});

		if (error) {
			if (error.message.includes("schedule_not_found")) {
				throw new ApiError(404, "not_found", "Schedule was not found.");
			}

			if (error.message.includes("invalid_generation_count")) {
				throw new ApiError(400, "bad_request", "generation_count must be an integer between 1 and 52.");
			}

			throw new ApiError(500, "internal_error", "Could not generate schedule classes.");
		}

		const counts = (data?.[0] ?? { created_count: 0, existing_count: 0, skipped_count: 0 }) as GenerationCounts;

		return jsonOk(counts, { headers });
	} catch (error) {
		return errorResponse(error, headers);
	}
});
