import type { ProductChangeRequestType } from "@class-kit/react";

export type SpotContext = Record<string, unknown> & {
	section: string | null;
	label: string | null;
	lessonId?: string;
	url: string;
	language: string;
	theme: string;
	viewport: { width: number; height: number };
};
export type Draft = { description: string; type: ProductChangeRequestType; context: Record<string, unknown> };
export type Upload = { id: number; file: File; status: "waiting" | "uploading" | "uploaded" | "failed" };
export const acceptedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
// ClassKit's attachment storage bucket limit, specified in the approved design.
export const maxFileBytes = 10 * 1024 * 1024;
export function fileError(file: Pick<File, "type" | "size">) {
	if (!acceptedTypes.includes(file.type)) return "fileType";
	if (file.size > maxFileBytes) return "fileSize";
	return null;
}
export function requestTitle(description: string) {
	const line = description.trim().split(/\r?\n/)[0];
	if (line.length <= 80) return line;
	const cut = line.slice(0, 80);
	if (/\s/.test(line[80])) return cut.trimEnd();
	const boundary = cut.search(/\s+\S*$/);
	return boundary > 0 ? cut.slice(0, boundary) : cut;
}
export function readDraft(key: string): Draft | null {
	try {
		const value = JSON.parse(localStorage.getItem(key) ?? "null");
		if (
			value &&
			typeof value.description === "string" &&
			["feature_request", "issue"].includes(value.type) &&
			value.context &&
			typeof value.context === "object" &&
			!Array.isArray(value.context)
		)
			return value;
	} catch {
		/* Storage can be unavailable or contain an old/malformed draft. */
	}
	return null;
}
export function saveDraft(key: string, draft: Draft | null) {
	try {
		if (draft) localStorage.setItem(key, JSON.stringify(draft));
		else localStorage.removeItem(key);
	} catch {
		/* The form remains usable without persistent browser storage. */
	}
}
export type FormState = { draft: Draft; phase: "editing" | "saving" | "saved"; requestId: string | null; error: boolean };
export type FormEvent = { type: "change"; patch: Partial<Draft> } | { type: "submit" } | { type: "saved"; requestId: string } | { type: "failed" };
export function formTransition(state: FormState, event: FormEvent): FormState {
	switch (event.type) {
		case "change":
			return state.phase === "editing" ? { ...state, draft: { ...state.draft, ...event.patch }, error: false } : state;
		case "submit":
			return state.phase === "editing" && state.draft.description.trim() ? { ...state, phase: "saving", error: false } : state;
		case "saved":
			return { ...state, phase: "saved", requestId: event.requestId, error: false };
		case "failed":
			return { ...state, phase: "editing", error: true };
	}
}
