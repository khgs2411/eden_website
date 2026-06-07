import { corsHeaders, handleCors } from "../_shared/cors.ts";
import {
	getServiceClient,
	readJsonBody,
	requireProductContext,
	requireProductManager,
} from "../_shared/context.ts";
import { ApiError, errorResponse, jsonOk } from "../_shared/errors.ts";

type ScheduleAction =
	| "list"
	| "create"
	| "update"
	| "pause"
	| "archive"
	| "create_skip"
	| "delete_skip"
	| "preview";
type ScheduleStatus = "draft" | "active" | "paused" | "archived";
type RecurrenceType = "one_time" | "weekly";

type ScheduleRequest = {
	[key: string]: unknown;
	product_key?: string;
	action?: ScheduleAction;
	id?: string;
	schedule_id?: string;
	template_id?: string;
	name?: string;
	status?: ScheduleStatus;
	recurrence_type?: RecurrenceType;
	weekdays?: unknown;
	starts_on?: string;
	ends_on?: string | null;
	start_time?: string;
	duration_minutes?: number;
	timezone?: string;
	skip_date?: string;
	reason?: string | null;
	from?: string;
	through?: string;
};

type ScheduleRow = {
	id: string;
	product_id: string;
	template_id: string;
	name: string;
	status: ScheduleStatus;
	recurrence_type: RecurrenceType;
	weekdays: number[];
	starts_on: string;
	ends_on: string | null;
	start_time: string;
	duration_minutes: number;
	timezone: string;
};

type PreviewOccurrence = {
	date: string;
	local_start: string;
	starts_at: string;
	ends_at: string;
	timezone: string;
	skipped: boolean;
};

type GenerationCounts = {
	created_count: number;
	existing_count: number;
	skipped_count: number;
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

function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!allowed.includes(value as T)) {
		throw new ApiError(400, "bad_request", `${field} is not supported.`);
	}

	return value as T;
}

function requireDate(value: unknown, field: string): string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new ApiError(400, "bad_request", `${field} must be a YYYY-MM-DD date.`);
	}

	return value;
}

function optionalDate(value: unknown, field: string): string | null {
	if (value === undefined || value === null) {
		return null;
	}

	return requireDate(value, field);
}

function requireTime(value: unknown, field: string): string {
	if (typeof value !== "string" || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
		throw new ApiError(400, "bad_request", `${field} must be HH:MM or HH:MM:SS.`);
	}

	const [hour, minute, second = "0"] = value.split(":").map(Number);
	if (hour > 23 || minute > 59 || second > 59) {
		throw new ApiError(400, "bad_request", `${field} must be a valid time.`);
	}

	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function requireDuration(value: unknown): number {
	if (!Number.isInteger(value) || Number(value) <= 0 || Number(value) > 1440) {
		throw new ApiError(400, "bad_request", "duration_minutes must be between 1 and 1440.");
	}

	return Number(value);
}

function normalizeWeekdays(value: unknown): number[] {
	if (!Array.isArray(value)) {
		throw new ApiError(400, "bad_request", "weekdays must be an array.");
	}

	const weekdays = value.map((day) => {
		if (!Number.isInteger(day) || Number(day) < 0 || Number(day) > 6) {
			throw new ApiError(400, "bad_request", "weekdays must contain integers from 0 to 6.");
		}

		return Number(day);
	});

	return [...new Set(weekdays)].sort((a, b) => a - b);
}

function requireTimezone(value: unknown): string {
	const timezone = requireString(value, "timezone");

	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
	} catch {
		throw new ApiError(400, "bad_request", "timezone must be a valid IANA timezone.");
	}

	return timezone;
}

function compareDates(a: string, b: string): number {
	return Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`);
}

function addDays(date: string, days: number): string {
	const next = new Date(`${date}T00:00:00Z`);
	next.setUTCDate(next.getUTCDate() + days);
	return next.toISOString().slice(0, 10);
}

function weekdayForDate(date: string): number {
	return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function toIsoUtc(date: Date): string {
	return date.toISOString().replace(".000Z", "Z");
}

function zonedParts(date: Date, timezone: string) {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	});
	const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		second: Number(parts.second),
	};
}

function localDateTimeToUtc(date: string, time: string, timezone: string): Date {
	const [year, month, day] = date.split("-").map(Number);
	const [hour, minute, second] = time.split(":").map(Number);
	let utcMillis = Date.UTC(year, month - 1, day, hour, minute, second);

	for (let index = 0; index < 3; index += 1) {
		const parts = zonedParts(new Date(utcMillis), timezone);
		const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
		const target = Date.UTC(year, month - 1, day, hour, minute, second);
		const delta = asUtc - target;
		if (delta === 0) {
			break;
		}
		utcMillis -= delta;
	}

	return new Date(utcMillis);
}

async function assertTemplateBelongsToProduct(productId: string, templateId: string): Promise<void> {
	const supabase = getServiceClient();
	const { data, error } = await supabase
		.from("class_templates")
		.select("id")
		.eq("product_id", productId)
		.eq("id", templateId)
		.maybeSingle();

	if (error) {
		throw new ApiError(500, "internal_error", "Could not verify class template.");
	}

	if (!data) {
		throw new ApiError(404, "not_found", "Class template was not found.");
	}
}

function normalizeScheduleInput(body: ScheduleRequest, existing?: ScheduleRow): Record<string, unknown> {
	const recurrenceType = (body.recurrence_type !== undefined
		? optionalEnum(body.recurrence_type, ["one_time", "weekly"], "recurrence_type")
		: existing?.recurrence_type) as RecurrenceType | undefined;
	const weekdays = body.weekdays !== undefined ? normalizeWeekdays(body.weekdays) : (existing?.weekdays ?? []);
	const startsOn = body.starts_on !== undefined ? requireDate(body.starts_on, "starts_on") : existing?.starts_on;
	const endsOn = body.ends_on !== undefined ? optionalDate(body.ends_on, "ends_on") : (existing?.ends_on ?? null);
	const timezone = body.timezone !== undefined ? requireTimezone(body.timezone) : existing?.timezone;
	const update: Record<string, unknown> = {};

	if (!recurrenceType) throw new ApiError(400, "bad_request", "recurrence_type is required.");
	if (!startsOn) throw new ApiError(400, "bad_request", "starts_on is required.");
	if (!timezone) throw new ApiError(400, "bad_request", "timezone is required.");
	if (endsOn && compareDates(endsOn, startsOn) < 0) throw new ApiError(400, "bad_request", "ends_on must be on or after starts_on.");
	if (recurrenceType === "one_time" && (weekdays.length !== 0 || endsOn !== null)) {
		throw new ApiError(400, "bad_request", "one_time schedules use starts_on only and no weekdays or ends_on.");
	}
	if (recurrenceType === "weekly" && weekdays.length === 0) {
		throw new ApiError(400, "bad_request", "weekly schedules require at least one weekday.");
	}

	if (body.name !== undefined) update.name = requireString(body.name, "name");
	if (body.template_id !== undefined) update.template_id = requireString(body.template_id, "template_id");
	if (body.status !== undefined) update.status = optionalEnum(body.status, ["draft", "active", "paused", "archived"], "status");
	if (body.recurrence_type !== undefined) update.recurrence_type = recurrenceType;
	if (body.weekdays !== undefined) update.weekdays = weekdays;
	if (body.starts_on !== undefined) update.starts_on = startsOn;
	if (body.ends_on !== undefined) update.ends_on = endsOn;
	if (body.start_time !== undefined) update.start_time = requireTime(body.start_time, "start_time");
	if (body.duration_minutes !== undefined) update.duration_minutes = requireDuration(body.duration_minutes);
	if (body.timezone !== undefined) update.timezone = timezone;

	return update;
}

async function loadSchedule(productId: string, scheduleId: string): Promise<ScheduleRow> {
	const supabase = getServiceClient();
	const { data, error } = await supabase
		.from("schedules")
		.select("*")
		.eq("product_id", productId)
		.eq("id", scheduleId)
		.maybeSingle();

	if (error) {
		throw new ApiError(500, "internal_error", "Could not load schedule.");
	}

	if (!data) {
		throw new ApiError(404, "not_found", "Schedule was not found.");
	}

	return data as ScheduleRow;
}

async function generateForActiveSchedule(productId: string, schedule: ScheduleRow): Promise<GenerationCounts | null> {
	if (schedule.status !== "active") {
		return null;
	}

	const supabase = getServiceClient();
	const { data, error } = await supabase.rpc("generate_schedule_classes", {
		p_product_id: productId,
		p_schedule_id: schedule.id,
	});

	if (error) {
		throw new ApiError(500, "internal_error", "Could not generate schedule classes.");
	}

	return (data?.[0] ?? { created_count: 0, existing_count: 0, skipped_count: 0 }) as GenerationCounts;
}

async function previewSchedule(productId: string, body: ScheduleRequest): Promise<PreviewOccurrence[]> {
	const schedule = await loadSchedule(productId, requireString(body.schedule_id ?? body.id, "schedule_id"));
	const from = requireDate(body.from, "from");
	const through = requireDate(body.through, "through");
	if (compareDates(through, from) < 0) {
		throw new ApiError(400, "bad_request", "through must be on or after from.");
	}

	const supabase = getServiceClient();
	const { data: skips, error } = await supabase
		.from("schedule_skips")
		.select("skip_date")
		.eq("product_id", productId)
		.eq("schedule_id", schedule.id)
		.gte("skip_date", from)
		.lte("skip_date", through);

	if (error) {
		throw new ApiError(500, "internal_error", "Could not load schedule skips.");
	}

	const skipDates = new Set((skips ?? []).map((skip) => String(skip.skip_date)));
	const rangeStart = compareDates(from, schedule.starts_on) > 0 ? from : schedule.starts_on;
	const rangeEnd = schedule.ends_on && compareDates(schedule.ends_on, through) < 0 ? schedule.ends_on : through;
	const occurrences: PreviewOccurrence[] = [];

	if (schedule.recurrence_type === "one_time") {
		if (compareDates(schedule.starts_on, from) >= 0 && compareDates(schedule.starts_on, through) <= 0) {
			occurrences.push(buildOccurrence(schedule, schedule.starts_on, skipDates.has(schedule.starts_on)));
		}
		return occurrences;
	}

	for (let date = rangeStart; compareDates(date, rangeEnd) <= 0; date = addDays(date, 1)) {
		if (schedule.weekdays.includes(weekdayForDate(date))) {
			occurrences.push(buildOccurrence(schedule, date, skipDates.has(date)));
		}
	}

	return occurrences;
}

function buildOccurrence(schedule: ScheduleRow, date: string, skipped: boolean): PreviewOccurrence {
	const startsAt = localDateTimeToUtc(date, schedule.start_time, schedule.timezone);
	const endsAt = new Date(startsAt.getTime() + schedule.duration_minutes * 60_000);

	return {
		date,
		local_start: schedule.start_time,
		starts_at: toIsoUtc(startsAt),
		ends_at: toIsoUtc(endsAt),
		timezone: schedule.timezone,
		skipped,
	};
}

Deno.serve(async (req) => {
	const preflight = handleCors(req);
	if (preflight) {
		return preflight;
	}

	const origin = req.headers.get("Origin") ?? undefined;
	const headers = corsHeaders(origin);

	try {
		const body = await readJsonBody<ScheduleRequest>(req);
		const pathname = new URL(req.url).pathname;
		const action = (body.action ?? (pathname.endsWith("/preview") ? "preview" : "list")) as ScheduleAction;
		const ctx = await requireProductContext(req, body);
		await requireProductManager(ctx);
		const supabase = getServiceClient();

		if (action === "list") {
			const { data: schedules, error } = await supabase
				.from("schedules")
				.select("*, schedule_skips(*)")
				.eq("product_id", ctx.product.id)
				.order("created_at", { ascending: false });

			if (error) {
				throw new ApiError(500, "internal_error", "Could not list schedules.");
			}

			return jsonOk({ schedules }, { headers });
		}

		if (action === "create") {
			const templateId = requireString(body.template_id, "template_id");
			await assertTemplateBelongsToProduct(ctx.product.id, templateId);
			const insert = normalizeScheduleInput(body);

			const { data, error } = await supabase
				.from("schedules")
				.insert({
					product_id: ctx.product.id,
					template_id: templateId,
					name: requireString(body.name, "name"),
					status: optionalEnum(body.status, ["draft", "active", "paused", "archived"], "status") ?? "draft",
					recurrence_type: insert.recurrence_type,
					weekdays: insert.weekdays ?? [],
					starts_on: insert.starts_on,
					ends_on: insert.ends_on ?? null,
					start_time: requireTime(body.start_time, "start_time"),
					duration_minutes: requireDuration(body.duration_minutes),
					timezone: insert.timezone,
				})
				.select("*")
				.single();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not create schedule.");
			}

			const generation = await generateForActiveSchedule(ctx.product.id, data as ScheduleRow);

			return jsonOk({ schedule: data, generation }, { headers });
		}

		if (action === "update") {
			const scheduleId = requireString(body.schedule_id ?? body.id, "schedule_id");
			const existing = await loadSchedule(ctx.product.id, scheduleId);
			if (body.template_id !== undefined) {
				await assertTemplateBelongsToProduct(ctx.product.id, requireString(body.template_id, "template_id"));
			}

			const update = normalizeScheduleInput(body, existing);
			const { data, error } = await supabase
				.from("schedules")
				.update(update)
				.eq("product_id", ctx.product.id)
				.eq("id", scheduleId)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not update schedule.");
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Schedule was not found.");
			}

			const generation = await generateForActiveSchedule(ctx.product.id, data as ScheduleRow);

			return jsonOk({ schedule: data, generation }, { headers });
		}

		if (action === "pause" || action === "archive") {
			const scheduleId = requireString(body.schedule_id ?? body.id, "schedule_id");
			const { data, error } = await supabase
				.from("schedules")
				.update({ status: action === "pause" ? "paused" : "archived" })
				.eq("product_id", ctx.product.id)
				.eq("id", scheduleId)
				.select("*")
				.maybeSingle();

			if (error) {
				throw new ApiError(500, "internal_error", `Could not ${action} schedule.`);
			}

			if (!data) {
				throw new ApiError(404, "not_found", "Schedule was not found.");
			}

			return jsonOk({ schedule: data }, { headers });
		}

		if (action === "create_skip") {
			const scheduleId = requireString(body.schedule_id ?? body.id, "schedule_id");
			await loadSchedule(ctx.product.id, scheduleId);
			const { data, error } = await supabase
				.from("schedule_skips")
				.upsert(
					{
						product_id: ctx.product.id,
						schedule_id: scheduleId,
						skip_date: requireDate(body.skip_date, "skip_date"),
						reason: optionalText(body.reason, "reason"),
					},
					{ onConflict: "schedule_id,skip_date" },
				)
				.select("*")
				.single();

			if (error) {
				throw new ApiError(500, "internal_error", "Could not create schedule skip.");
			}

			return jsonOk({ skip: data }, { headers });
		}

		if (action === "delete_skip") {
			const scheduleId = requireString(body.schedule_id ?? body.id, "schedule_id");
			const skipDate = requireDate(body.skip_date, "skip_date");
			const { error } = await supabase
				.from("schedule_skips")
				.delete()
				.eq("product_id", ctx.product.id)
				.eq("schedule_id", scheduleId)
				.eq("skip_date", skipDate);

			if (error) {
				throw new ApiError(500, "internal_error", "Could not delete schedule skip.");
			}

			return jsonOk({ deleted: true }, { headers });
		}

		if (action === "preview") {
			const occurrences = await previewSchedule(ctx.product.id, body);
			return jsonOk({ occurrences }, { headers });
		}

		throw new ApiError(400, "bad_request", "Unsupported schedule action.");
	} catch (error) {
		return errorResponse(error, headers);
	}
});
