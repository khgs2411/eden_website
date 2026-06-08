import {
	cancelClassRegistration as cancelClassRegistrationWithClient,
	invokeProductFunction as invokeProductFunctionWithClient,
	listUserClasses as listUserClassesWithClient,
	registerForClass as registerForClassWithClient,
} from "@eden/class-management-react";
import type {
	ApiErrorCode,
	ApiResponse,
	ClassRegistrationResponse,
	ClassVisibility,
	MembershipRequirement,
	ProductContextResponse,
	ProductRole,
	ProductSummary,
	ProductUserStatus,
	RegistrationPolicy,
	RegistrationStatusValue as RegistrationStatus,
	UserClassesResponse,
	UserClassSummary,
	ProductUserSummary,
} from "@eden/class-management-react";

import { classManagementClient, productKey } from "@/lib/supabase";

export { productKey };
export type {
	ApiErrorCode,
	ApiResponse,
	ClassRegistrationResponse,
	ClassVisibility,
	MembershipRequirement,
	ProductContextResponse,
	ProductRole,
	ProductSummary,
	ProductUserStatus,
	ProductUserSummary,
	RegistrationPolicy,
	RegistrationStatus,
	UserClassesResponse,
	UserClassSummary,
};

export function invokeProductFunction<T>(functionName: string, body: Record<string, unknown> = {}): Promise<ApiResponse<T>> {
	return invokeProductFunctionWithClient<T>(classManagementClient, functionName, body);
}

export function listUserClasses(isSignedIn: boolean) {
	return listUserClassesWithClient(classManagementClient, isSignedIn);
}

export function registerForClass(classId: string) {
	return registerForClassWithClient(classManagementClient, classId);
}

export function cancelClassRegistration(registrationId: string) {
	return cancelClassRegistrationWithClient(classManagementClient, registrationId);
}
