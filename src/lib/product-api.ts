import { supabase } from "@/lib/supabase";

export type ApiErrorCode = "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "internal_error";

export type ApiResponse<T> =
	| { data: T; error: null }
	| { data: null; error: { code: ApiErrorCode; message: string } };

export type ProductRole = "manager" | "user";
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

export const productKey = import.meta.env.VITE_PRODUCT_KEY || "eden";

export async function invokeProductFunction<T>(
	functionName: string,
	body: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
	if (!supabase) {
		return {
			data: null,
			error: {
				code: "bad_request",
				message: "Supabase is not configured for this environment.",
			},
		};
	}

	const { data, error } = await supabase.functions.invoke<ApiResponse<T>>(functionName, {
		body: {
			...body,
			product_key: body.product_key ?? productKey,
		},
	});

	if (error) {
		return {
			data: null,
			error: {
				code: "internal_error",
				message: error.message,
			},
		};
	}

	if (!data) {
		return {
			data: null,
			error: {
				code: "internal_error",
				message: "Empty response from product API.",
			},
		};
	}

	return data;
}
