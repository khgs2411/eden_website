import type { ClassKitClient } from "@class-kit/react";
import { useReducer, useRef, type ClipboardEvent } from "react";
import { fileError, type Upload } from "./request-model";

export type RequestsApi = ClassKitClient["management"]["changeRequests"];
type UploadState = { files: Upload[]; errors: { name: string; reason: string }[] };
type UploadEvent =
	{ type: "add"; files: Upload[]; errors: UploadState["errors"] } | { type: "remove"; id: number } | { type: "status"; id: number; status: Upload["status"] };
export function uploadTransition(state: UploadState, event: UploadEvent): UploadState {
	switch (event.type) {
		case "add":
			return { files: [...state.files, ...event.files], errors: event.errors };
		case "remove":
			return { ...state, files: state.files.filter((file) => file.id !== event.id) };
		case "status":
			return { ...state, files: state.files.map((file) => (file.id === event.id ? { ...file, status: event.status } : file)) };
	}
}
export function useUploads(api: RequestsApi) {
	const [state, dispatch] = useReducer(uploadTransition, { files: [], errors: [] });
	const nextId = useRef(0);
	const inFlight = useRef(new Set<number>());
	function add(files: File[]) {
		const valid: Upload[] = [];
		const errors: UploadState["errors"] = [];
		for (const file of files) {
			const reason = fileError(file);
			if (reason) errors.push({ name: file.name, reason });
			else valid.push({ id: nextId.current++, file, status: "waiting" });
		}
		dispatch({ type: "add", files: valid, errors });
		return valid;
	}
	async function upload(requestId: string, item: Upload) {
		if (inFlight.current.has(item.id) || item.status === "uploaded") return;
		inFlight.current.add(item.id);
		dispatch({ type: "status", id: item.id, status: "uploading" });
		try {
			await api.uploadAttachment(requestId, { file: item.file });
			dispatch({ type: "status", id: item.id, status: "uploaded" });
		} catch {
			dispatch({ type: "status", id: item.id, status: "failed" });
		} finally {
			inFlight.current.delete(item.id);
		}
	}
	function paste(event: ClipboardEvent) {
		const files = Array.from(event.clipboardData.files);
		if (files.length) {
			event.preventDefault();
			add(files);
		}
	}
	return { ...state, add, upload, paste, remove: (id: number) => dispatch({ type: "remove", id }) };
}
