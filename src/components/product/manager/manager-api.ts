import { callManagerApi as callManagerApiWithClient } from "@eden/class-management-react";
import type {
	AttendanceStatus,
	ClassParticipant,
	ClassTemplate,
	CustomField,
	CustomFieldType,
	ManagedClass,
	MembershipGrant,
	MembershipGrantStatus,
	MembershipLedgerEntry,
	MembershipMode,
	MembershipRequirement,
	MembershipType,
	ParticipantKind,
	RecurrenceType,
	Registration,
	RegistrationPolicy,
	Schedule,
	ScheduleGenerationResult,
	SchedulePreviewOccurrence,
	ScheduleStatus,
	Visibility,
} from "@eden/class-management-react";

import { classManagementClient } from "@/lib/supabase";

export type {
	AttendanceStatus,
	ClassParticipant,
	ClassTemplate,
	CustomField,
	CustomFieldType,
	ManagedClass,
	MembershipGrant,
	MembershipGrantStatus,
	MembershipLedgerEntry,
	MembershipMode,
	MembershipRequirement,
	MembershipType,
	ParticipantKind,
	RecurrenceType,
	Registration,
	RegistrationPolicy,
	Schedule,
	ScheduleGenerationResult,
	SchedulePreviewOccurrence,
	ScheduleStatus,
	Visibility,
};

export function callManagerApi<T>(functionName: string, body: Record<string, unknown>) {
	return callManagerApiWithClient<T>(classManagementClient, functionName, body);
}
