import { invokeProductFunction } from "@/lib/product-api";

export type CustomFieldType = "text" | "long text" | "number" | "boolean" | "select" | "multi-select" | "date" | "URL";
export type Visibility = "public" | "hidden" | "members_only";
export type RegistrationPolicy = "auto_approve" | "member_auto_approve" | "approval_required";
export type MembershipRequirement = "none" | "required";
export type ScheduleStatus = "draft" | "active" | "paused" | "archived";
export type RecurrenceType = "one_time" | "weekly";
export type MembershipMode = "stock" | "limited_stock" | "limited" | "infinite";
export type MembershipGrantStatus = "active" | "inactive" | "revoked" | "replaced" | "expired";
export type ParticipantKind = "registered" | "walk_in" | "trial";
export type AttendanceStatus = "present" | "absent";

export type CustomField = {
	key: string;
	label: string;
	type: CustomFieldType;
	required: boolean;
	options?: string[];
};

export type ClassTemplate = {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	default_capacity: number;
	default_location: string | null;
	default_visibility: Visibility;
	default_registration_policy: RegistrationPolicy;
	default_membership_requirement: MembershipRequirement;
	default_notes: string | null;
	custom_fields: CustomField[];
	custom_defaults: Record<string, unknown>;
	status: "active" | "inactive";
};

export type Schedule = {
	id: string;
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

export type SchedulePreviewOccurrence = {
	date: string;
	local_start: string;
	starts_at: string;
	ends_at: string;
	timezone: string;
	skipped: boolean;
};

export type ScheduleGenerationResult = {
	created_count: number;
	existing_count: number;
	skipped_count: number;
};

export type ManagedClass = {
	id: string;
	template_id: string | null;
	schedule_id: string | null;
	generated_for_date: string | null;
	source_timezone: string | null;
	name: string;
	description: string | null;
	category: string | null;
	starts_at: string;
	ends_at: string;
	capacity: number;
	location: string | null;
	status: "draft" | "published";
	lifecycle_status: "created" | "cancelled" | "in_progress" | "completed";
	visibility: Visibility;
	registration_policy: RegistrationPolicy;
	membership_requirement: MembershipRequirement;
	notes: string | null;
	custom_data: Record<string, unknown>;
};

export type Registration = {
	id: string;
	class_id: string;
	user_id: string;
	status: "pending" | "approved" | "rejected" | "cancelled";
	stock_consumed: number;
	created_at: string;
};

export type MembershipType = {
	id: string;
	name: string;
	mode: MembershipMode;
	default_stock: number | null;
	default_duration_days: number | null;
	status: "active" | "inactive";
	created_at: string;
	updated_at: string;
};

export type MembershipGrant = {
	id: string;
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

export type MembershipLedgerEntry = {
	id: string;
	user_id: string;
	membership_grant_id: string | null;
	event_type: string;
	stock_delta: number;
	class_id: string | null;
	registration_id: string | null;
	metadata: Record<string, unknown>;
	created_by: string | null;
	created_at: string;
};

export type ClassParticipant = {
	id: string;
	class_id: string;
	participant_kind: ParticipantKind;
	user_id: string | null;
	registration_id: string | null;
	trial_name: string | null;
	trial_contact: string | null;
	attendance_status: AttendanceStatus;
	created_at: string;
	updated_at: string;
};

export async function callManagerApi<T>(functionName: string, body: Record<string, unknown>) {
	const response = await invokeProductFunction<T>(functionName, body);
	if (response.error) {
		throw new Error(response.error.message);
	}
	return response.data;
}
