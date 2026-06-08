import type { ClassManagementClient } from "./supabase";
import type { ApiResponse, ClassRegistrationResponse, ProductContextResponse, UserClassesResponse } from "../types";

export async function invokeProductFunction<T>(
	client: ClassManagementClient | null,
	functionName: string,
	body: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
	if (!client) {
		return {
			data: null,
			error: {
				code: "bad_request",
				message: "Supabase is not configured for this environment.",
			},
		};
	}

	const nextBody = { ...body };
	if (!("product_key" in nextBody) && client.productKey) {
		nextBody.product_key = client.productKey;
	}

	const { data, error } = await client.supabase.functions.invoke<ApiResponse<T>>(functionName, {
		body: nextBody,
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

export function getProductContext(client: ClassManagementClient | null) {
	return invokeProductFunction<ProductContextResponse>(client, "product-context");
}

export function listUserClasses(client: ClassManagementClient | null, isSignedIn: boolean) {
	return invokeProductFunction<UserClassesResponse>(client, "classes", {
		action: isSignedIn ? "list_user" : "list_public",
	});
}

export function registerForClass(client: ClassManagementClient | null, classId: string) {
	return invokeProductFunction<ClassRegistrationResponse>(client, "register-class", {
		action: "register",
		class_id: classId,
	});
}

export function cancelClassRegistration(client: ClassManagementClient | null, registrationId: string) {
	return invokeProductFunction<ClassRegistrationResponse>(client, "register-class", {
		action: "cancel",
		registration_id: registrationId,
	});
}
