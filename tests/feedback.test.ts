import { describe, expect, test } from "bun:test";
import { fileError, formTransition, maxFileBytes, readDraft, requestTitle, saveDraft, type FormState } from "../src/features/feedback/request-model";

describe("request validation and title", () => {
	test("uses the first nonblank line and cuts at a complete word", () => {
		expect(requestTitle(" \nChange this\nExtra detail")).toBe("Change this");
		expect(requestTitle("word ".repeat(20))).toBe("word ".repeat(16).trim());
		expect(requestTitle("a".repeat(90))).toHaveLength(80);
	});
	test("accepts bucket types at the size boundary and rejects other files", () => {
		for (const type of ["image/png", "image/jpeg", "image/webp", "application/pdf"]) {
			expect(fileError({ type, size: maxFileBytes })).toBeNull();
			expect(fileError({ type, size: maxFileBytes + 1 })).toBe("fileSize");
		}
		expect(fileError({ type: "image/svg+xml", size: 1 })).toBe("fileType");
	});
});

describe("saved request boundary", () => {
	const initial: FormState = { draft: { description: "Please change this", type: "feature_request", context: { label: "Home" } }, phase: "editing", requestId: null, error: false };
	test("cannot create again or mutate the draft after saving, even if uploads fail", () => {
		const saving = formTransition(initial, { type: "submit" });
		expect(formTransition(saving, { type: "submit" })).toBe(saving);
		const saved = formTransition(saving, { type: "saved", requestId: "new-revision" });
		expect(saved.requestId).toBe("new-revision");
		expect(formTransition(saved, { type: "submit" })).toBe(saved);
		expect(formTransition(saved, { type: "change", patch: { description: "changed" } })).toBe(saved);
	});
	test("retains the draft on failure and rejects whitespace-only submission", () => {
		const failed = formTransition(formTransition(initial, { type: "submit" }), { type: "failed" });
		expect(failed.draft).toEqual(initial.draft);
		expect(failed.phase).toBe("editing");
		const empty = { ...initial, draft: { ...initial.draft, description: " \n " } };
		expect(formTransition(empty, { type: "submit" })).toBe(empty);
	});
	test("all draft storage operations tolerate unavailable storage", () => {
		// Bun's test environment has no browser localStorage.
		expect(readDraft("unavailable")).toBeNull();
		expect(() => saveDraft("unavailable", initial.draft)).not.toThrow();
		expect(() => saveDraft("unavailable", null)).not.toThrow();
	});
});
