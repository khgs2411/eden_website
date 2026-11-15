import type { ProductChangeRequest } from "@class-kit/react";
import { useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Attachments } from "./attachments";
import { useUploads, type RequestsApi } from "./use-uploads";
import { FeedbackSheet } from "./feedback-sheet";
import { formTransition, readDraft, requestTitle, saveDraft, type Draft, type FormState } from "./request-model";

export function RequestSheet({ api, draftKey, context, request, onClose, onSaved }: {
	api: RequestsApi; draftKey: string; context: Record<string, unknown>; request?: ProductChangeRequest; onClose: () => void; onSaved: () => void;
}) {
	const { t } = useTranslation();
	const [state, dispatch] = useReducer(formTransition, undefined, (): FormState => {
		const stored = readDraft(draftKey);
		const draft = stored ?? { description: request?.description ?? "", type: request?.type ?? "feature_request", context: request?.context ?? context };
		// An explicitly selected spot replaces only the saved draft's old spot.
		return { draft: !request && context.section ? { ...draft, context } : draft, phase: "editing", requestId: null, error: false };
	});
	const uploads = useUploads(api);
	const submitting = useRef(false);
	const textarea = useRef<HTMLTextAreaElement>(null);
	useEffect(() => { textarea.current?.focus(); }, []);
	useEffect(() => {
		if (state.phase === "editing") saveDraft(draftKey, state.draft);
	}, [draftKey, state.draft, state.phase]);
	function change(patch: Partial<Draft>) { dispatch({ type: "change", patch }); }
	async function submit() {
		if (submitting.current || state.phase !== "editing" || !state.draft.description.trim()) return;
		submitting.current = true;
		dispatch({ type: "submit" });
		const input = { ...state.draft, description: state.draft.description.trim(), title: requestTitle(state.draft.description) };
		try {
			const { request: saved } = request ? await api.update({ ...input, requestId: request.id }) : await api.create(input);
			dispatch({ type: "saved", requestId: saved.id });
			saveDraft(draftKey, null);
			onSaved();
			for (const item of uploads.files) await uploads.upload(saved.id, item);
			onSaved();
		} catch { dispatch({ type: "failed" }); } finally { submitting.current = false; }
	}
	const locked = state.phase !== "editing";
	const label = typeof state.draft.context.label === "string" ? state.draft.context.label : null;
	return <FeedbackSheet title={t(request ? "feedback.edit" : "feedback.newRequest")} onClose={onClose}>
		{state.phase === "saved" ? <div className="grid gap-4">
			<p role="status" className="font-display text-xl">{t(uploads.files.some((item) => item.status !== "uploaded") ? "feedback.savedWithFiles" : "feedback.success")}</p>
			<Attachments uploads={uploads} locked requestId={state.requestId} onUploaded={onSaved} />
		</div> : <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit(); }} onPaste={(event) => { if (!locked) uploads.paste(event); }}>
			{label && <div className="flex items-center gap-2 border-s-2 border-accent-foreground ps-3">
				<span className="min-w-0 flex-1 break-words">{label}</span>
				<button type="button" className="feedback-action" disabled={locked} aria-label={t("feedback.removeSpot")} onClick={() => {
					const next = { ...state.draft.context, section: null, label: null };
					delete (next as Record<string, unknown>).lessonId;
					change({ context: next });
				}}>{t("feedback.remove")}</button>
			</div>}
			<label className="grid gap-2 font-display" htmlFor="feedback-description">
				{t("feedback.description")}
				<textarea ref={textarea} id="feedback-description" required rows={4} disabled={locked} className="w-full resize-y border border-border bg-background p-3 text-base text-foreground focus-visible:outline-accent-foreground" value={state.draft.description} onChange={(event) => change({ description: event.target.value })} />
			</label>
			<fieldset disabled={locked} className="grid grid-cols-2 gap-2">
				<legend className="sr-only">{t("feedback.typeLabel")}</legend>
				{(["feature_request", "issue"] as const).map((type) => <button key={type} type="button" aria-pressed={state.draft.type === type} className={`feedback-action ${state.draft.type === type ? "feedback-primary" : ""}`} onClick={() => change({ type })}>{t(`feedback.types.${type}`)}</button>)}
			</fieldset>
			<Attachments uploads={uploads} locked={locked} />
			{state.error && <p role="alert">{t("feedback.saveError")}</p>}
			<button type="submit" className="feedback-action feedback-primary" disabled={locked || !state.draft.description.trim()}>{t(locked ? "feedback.saving" : "feedback.submit")}</button>
		</form>}
	</FeedbackSheet>;
}
