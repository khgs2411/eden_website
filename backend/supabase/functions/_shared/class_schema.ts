import { ApiError } from "./errors.ts";

export type CustomFieldType =
	| "text"
	| "long text"
	| "number"
	| "boolean"
	| "select"
	| "multi-select"
	| "date"
	| "URL";

export type CustomField = {
	key: string;
	label: string;
	type: CustomFieldType;
	required: boolean;
	options?: string[];
	default?: unknown;
	visible?: boolean;
	searchable?: boolean;
};

const fieldTypes = new Set<CustomFieldType>([
	"text",
	"long text",
	"number",
	"boolean",
	"select",
	"multi-select",
	"date",
	"URL",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireText(value: unknown, field: string): string {
	if (!value || typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${field} is required.`);
	}

	return value;
}

function assertValueMatchesField(field: CustomField, value: unknown, source: string): void {
	if (value === undefined || value === null) {
		return;
	}

	if (field.type === "number" && typeof value !== "number") {
		throw new ApiError(400, "bad_request", `${source}.${field.key} must be a number.`);
	}

	if (field.type === "boolean" && typeof value !== "boolean") {
		throw new ApiError(400, "bad_request", `${source}.${field.key} must be a boolean.`);
	}

	if ((field.type === "text" || field.type === "long text") && typeof value !== "string") {
		throw new ApiError(400, "bad_request", `${source}.${field.key} must be text.`);
	}

	if (field.type === "URL") {
		if (typeof value !== "string") {
			throw new ApiError(400, "bad_request", `${source}.${field.key} must be a URL string.`);
		}

		try {
			new URL(value);
		} catch {
			throw new ApiError(400, "bad_request", `${source}.${field.key} must be a valid URL.`);
		}
	}

	if (field.type === "date") {
		if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
			throw new ApiError(400, "bad_request", `${source}.${field.key} must be a date string.`);
		}
	}

	if (field.type === "select") {
		if (typeof value !== "string" || !field.options?.includes(value)) {
			throw new ApiError(400, "bad_request", `${source}.${field.key} must be one of the configured options.`);
		}
	}

	if (field.type === "multi-select") {
		if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && field.options?.includes(item))) {
			throw new ApiError(400, "bad_request", `${source}.${field.key} must be configured options.`);
		}
	}
}

export function normalizeCustomFields(value: unknown): CustomField[] {
	if (value === undefined) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new ApiError(400, "bad_request", "custom_fields must be an array.");
	}

	const seenKeys = new Set<string>();

	return value.map((item, index) => {
		if (!isPlainObject(item)) {
			throw new ApiError(400, "bad_request", `custom_fields.${index} must be an object.`);
		}

		const key = requireText(item.key, `custom_fields.${index}.key`);
		if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)) {
			throw new ApiError(400, "bad_request", `custom_fields.${index}.key must start with a letter and use letters, numbers, or underscores.`);
		}

		if (seenKeys.has(key)) {
			throw new ApiError(400, "bad_request", `custom_fields key ${key} is duplicated.`);
		}
		seenKeys.add(key);

		const label = requireText(item.label, `custom_fields.${index}.label`);
		const type = item.type;
		if (!fieldTypes.has(type as CustomFieldType)) {
			throw new ApiError(400, "bad_request", `custom_fields.${index}.type is not supported.`);
		}

		const field: CustomField = {
			key,
			label,
			type: type as CustomFieldType,
			required: item.required === true,
		};

		if (item.visible !== undefined) {
			field.visible = item.visible === true;
		}

		if (item.searchable !== undefined) {
			field.searchable = item.searchable === true;
		}

		if (field.type === "select" || field.type === "multi-select") {
			if (!Array.isArray(item.options) || item.options.length === 0 || !item.options.every((option) => typeof option === "string" && option.length > 0)) {
				throw new ApiError(400, "bad_request", `custom_fields.${index}.options must be non-empty strings.`);
			}
			field.options = Array.from(new Set(item.options as string[]));
		}

		if ("default" in item) {
			assertValueMatchesField(field, item.default, "custom_fields.default");
			field.default = item.default;
		}

		return field;
	});
}

export function normalizeCustomDefaults(value: unknown, fields: CustomField[]): Record<string, unknown> {
	if (value === undefined) {
		return {};
	}

	if (!isPlainObject(value)) {
		throw new ApiError(400, "bad_request", "custom_defaults must be an object.");
	}

	const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

	for (const [key, defaultValue] of Object.entries(value)) {
		const field = fieldsByKey.get(key);
		if (!field) {
			throw new ApiError(400, "bad_request", `custom_defaults.${key} is not defined in custom_fields.`);
		}
		assertValueMatchesField(field, defaultValue, "custom_defaults");
	}

	return value;
}

export function normalizeCustomData(value: unknown): Record<string, unknown> {
	if (value === undefined) {
		return {};
	}

	if (!isPlainObject(value)) {
		throw new ApiError(400, "bad_request", "custom_data must be an object.");
	}

	return value;
}

export function validateCustomData(
	fields: CustomField[],
	defaults: Record<string, unknown>,
	data: Record<string, unknown>,
): Record<string, unknown> {
	const fieldsByKey = new Map(fields.map((field) => [field.key, field]));
	const merged = { ...defaults, ...data };

	for (const [key, value] of Object.entries(data)) {
		const field = fieldsByKey.get(key);
		if (!field) {
			throw new ApiError(400, "bad_request", `custom_data.${key} is not defined in the template.`);
		}
		assertValueMatchesField(field, value, "custom_data");
	}

	for (const field of fields) {
		if (field.required && (merged[field.key] === undefined || merged[field.key] === null || merged[field.key] === "")) {
			throw new ApiError(400, "bad_request", `custom_data.${field.key} is required.`);
		}
	}

	return merged;
}
