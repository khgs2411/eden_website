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
};

type GenerationCounts = {
	created_count: number;
	existing_count: number;
	skipped_count: number;
};

function optionalScheduleId(value: unknown): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== "string" || value.length === 0) {
		throw new ApiError(400, "bad_request", "schedule_id must be a UUID string.");
	}

	return value;
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
		const supabase = getServiceClient();
		const { data, error } = await supabase.rpc("generate_schedule_classes", {
			p_product_id: ctx.product.id,
			p_schedule_id: scheduleId,
		});

		if (error) {
			if (error.message.includes("schedule_not_found")) {
				throw new ApiError(404, "not_found", "Schedule was not found.");
			}

			throw new ApiError(500, "internal_error", "Could not generate schedule classes.");
		}

		const counts = (data?.[0] ?? { created_count: 0, existing_count: 0, skipped_count: 0 }) as GenerationCounts;

		return jsonOk(counts, { headers });
	} catch (error) {
		return errorResponse(error, headers);
	}
});
