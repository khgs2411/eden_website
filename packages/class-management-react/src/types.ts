export type ApiErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal_error";

export type ApiResponse<T> =
	| { data: T; error: null }
	| { data: null; error: { code: ApiErrorCode; message: string } };

export type ProductRole = "admin" | "manager" | "user";
export type ProductUserStatus = "active" | "inactive";

export type ProductSummary = {
	product_key: string;
	name: string;
};

export type ProductUserSummary = {
	role: ProductRole;
	status: ProductUserStatus;
};

export type ProductContextResponse = {
	product: ProductSummary;
	product_user: ProductUserSummary | null;
};

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ClassVisibility = "public" | "hidden" | "members_only";
export type RegistrationPolicy = "auto_approve" | "member_auto_approve" | "approval_required";
export type MembershipRequirement = "none" | "required";

export type UserClassSummary = {
	id: string;
	name: string;
	description: string | null;
	category: string | null;
	starts_at: string;
	ends_at: string;
	location: string | null;
	capacity: number;
	approved_count?: number;
	visibility: ClassVisibility;
	registration_policy: RegistrationPolicy;
	membership_requirement: MembershipRequirement;
	user_registration: { id: string; status: RegistrationStatus } | null;
};

export type UserClassesResponse = {
	classes: UserClassSummary[];
};

export type ClassRegistrationResponse = {
	registration_id: string;
	status: RegistrationStatus;
	stock_consumed: number;
	registration: {
		id: string;
		class_id: string;
		status: RegistrationStatus;
	};
};
